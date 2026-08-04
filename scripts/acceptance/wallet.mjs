/**
 * Headless EIP-1193 wallet for browser-driven acceptance (Task 15).
 *
 * TESTNET ONLY. Backed by viem + the Base Sepolia deployer key from the repo-root
 * `.env` (PRIVATE_KEY). Never point this at a mainnet RPC or a funded key.
 *
 * Usage from a browser-automation --script file:
 *
 *   import { installWallet } from './wallet.mjs'
 *   const wallet = await installWallet(page)   // exposes the Node-side RPC bridge
 *   await wallet.inject()                      // (re)publish the provider, after every navigation
 *
 * `installWallet` exposes a Node-side RPC handler to the page via
 * page.exposeFunction, and `inject()` evaluates an EIP-1193 provider into the page
 * that forwards every request to it. The provider is published three ways so any
 * of the app's connectors can find it: window.ethereum, EIP-6963
 * announceProvider, and window.ethereum.providers[].
 *
 * NOTE (why evaluate, not addInitScript): the browser-automation runner drives
 * patchright, a stealth Playwright fork that executes addInitScript in an
 * ISOLATED world. A provider defined there is invisible to page scripts — probed
 * and confirmed during Task 15. page.exposeFunction and page.evaluate do reach
 * the main world, so the provider is injected post-load and announced via
 * EIP-6963, which wagmi's mipd store subscribes to continuously.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')

// viem lives in the vendored frontend workspace
const require_ = createRequire(path.join(REPO, 'apps/web/apps/web/package.json'))
export const viem = require_("viem")
const viemAccounts = require_('viem/accounts')
const viemChains = require_('viem/chains')

export const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org'
export const CHAIN_ID = 84532

export function loadPrivateKey() {
  const env = readFileSync(path.join(REPO, '.env'), 'utf8')
  const m = env.match(/^\s*(?:DEPLOYER_)?PRIVATE_KEY\s*=\s*"?([0-9a-fA-Fx]+)"?\s*$/m)
  if (!m) throw new Error('DEPLOYER_PRIVATE_KEY / PRIVATE_KEY not found in repo-root .env')
  return m[1].startsWith('0x') ? m[1] : `0x${m[1]}`
}

export function makeClients() {
  const account = viemAccounts.privateKeyToAccount(loadPrivateKey())
  const chain = viemChains.baseSepolia
  const transport = viem.http(RPC_URL)
  return {
    account,
    chain,
    publicClient: viem.createPublicClient({ chain, transport }),
    walletClient: viem.createWalletClient({ account, chain, transport }),
    raw: viem.createPublicClient({ chain, transport }),
  }
}

const PROVIDER_SRC = (chainIdHex, address) => `
(() => {
  const CHAIN_ID = '${chainIdHex}'
  const ACCOUNTS = ['${address}']
  const listeners = {}
  const provider = {
    isMetaMask: true,
    isCryptoHawkingAcceptanceWallet: true,
    _state: { accounts: ACCOUNTS, isConnected: true, isUnlocked: true, initialized: true },
    chainId: CHAIN_ID,
    networkVersion: String(parseInt(CHAIN_ID, 16)),
    selectedAddress: ACCOUNTS[0],
    isConnected: () => true,
    async request(args) {
      const method = args && args.method
      const params = (args && args.params) || []
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return ACCOUNTS
      if (method === 'eth_chainId') return CHAIN_ID
      if (method === 'net_version') return String(parseInt(CHAIN_ID, 16))
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null
      if (method === 'wallet_watchAsset') return true
      if (method === 'wallet_getPermissions') return [{ parentCapability: 'eth_accounts' }]
      if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }]
      const res = await window.__hawkRpc(method, params)
      if (res && res.__error) throw Object.assign(new Error(res.__error), { code: res.code || -32000 })
      return res.result
    },
    send(a, b) {
      if (typeof a === 'string') return this.request({ method: a, params: b })
      if (typeof b === 'function') return this.sendAsync(a, b)
      return this.request(a)
    },
    sendAsync(payload, cb) {
      this.request(payload).then(
        (result) => cb(null, { id: payload.id, jsonrpc: '2.0', result }),
        (error) => cb(error, null),
      )
    },
    on(event, fn) {
      ;(listeners[event] = listeners[event] || []).push(fn)
      return provider
    },
    removeListener(event, fn) {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn)
      return provider
    },
    removeAllListeners() {
      for (const k of Object.keys(listeners)) delete listeners[k]
      return provider
    },
    emit(event, ...args) {
      for (const fn of listeners[event] || []) fn(...args)
    },
  }
  provider.providers = [provider]
  try {
    Object.defineProperty(window, 'ethereum', { value: provider, writable: true, configurable: true })
  } catch (e) {
    window.ethereum = provider
  }

  // EIP-6963 discovery
  const detail = Object.freeze({
    info: {
      uuid: '4f2a6b1e-0a3d-4e57-9f0f-2c6f2a1d3e55',
      name: 'MetaMask',
      icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
      rdns: 'io.metamask',
    },
    provider,
  })
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }))
  window.addEventListener('eip6963:requestProvider', announce)
  announce()
  setTimeout(announce, 0)
  window.addEventListener('load', announce)

  // wagmi's injected connector listens for these after mount
  setTimeout(() => provider.emit('connect', { chainId: CHAIN_ID }), 50)
})()
`

/**
 * Connect the injected wallet through the app's own Connect Wallet modal.
 * Returns { connected, address, uiText } — `connected` means the header shows the
 * account, i.e. wagmi actually adopted our provider.
 */
export async function connectWallet(page, wallet, { settle = 11000, reload = true } = {}) {
  // reload so the document-start provider is present before the app mounts
  if (reload) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 })
  }
  await page.waitForTimeout(settle)
  await wallet.inject()
  await killDevOverlay(page)
  await page.waitForTimeout(1500)

  const already = await page.evaluate(
    (a) => (document.body.innerText || '').includes(a.slice(0, 6)),
    wallet.address,
  )
  if (already) return { connected: true, alreadyConnected: true }

  // open the modal (dev overlay removed, so a normal click works)
  const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).first()
  try {
    await connectBtn.click({ timeout: 10000 })
  } catch {
    await connectBtn.dispatchEvent('click')
  }
  await page.waitForTimeout(4000)

  // Pick the injected wallet from the list rendered into #portal-root. The entries
  // are styled-component <div>s (StyledButton, variant="text"), not <button>s, so
  // role/name lookups miss them — walk up from the label to the StyledButton node.
  const box = await page.evaluate((name) => {
    const root = document.getElementById('portal-root')
    if (!root) return { err: 'no portal-root' }
    const label = [...root.querySelectorAll('*')].filter((e) => (e.textContent || '').trim() === name).pop()
    if (!label) return { err: 'no wallet entry' }
    let el = label
    while (el && el !== root && !/StyledButton/.test((el.className || '').toString())) el = el.parentElement
    if (!el || el === root) return { err: 'no clickable ancestor' }
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, 'Metamask')
  if (box.err) return { connected: false, error: box.err }
  // the dev overlay is re-inserted on every render — strip it again immediately
  // before the trusted mouse click or it swallows the event
  await killDevOverlay(page)
  await page.mouse.click(box.x, box.y)
  await page.waitForTimeout(9000)
  await killDevOverlay(page)

  const uiText = await page.evaluate(() => (document.body.innerText || '').slice(0, 400))
  const portalText = await page.evaluate(() =>
    (document.getElementById('portal-root')?.innerText || '').slice(0, 400),
  )
  const short = wallet.address.slice(0, 6)
  return { connected: uiText.includes(short), documentInjected: wallet.documentInjected, portalText, uiText }
}

/**
 * The Next.js dev-server injects a full-viewport <nextjs-portal> (error overlay /
 * build indicator) that intercepts pointer events, so Playwright's actionability
 * check fails on buttons underneath it. Strip it before driving the UI. Dev-only
 * artifact — it does not exist in a production build.
 */
export async function killDevOverlay(page) {
  return page
    .evaluate(() => {
      let n = 0
      for (const el of document.querySelectorAll('nextjs-portal')) {
        el.remove()
        n++
      }
      return n
    })
    .catch(() => 0)
}

export async function installWallet(page, { log = () => {} } = {}) {
  const { account, publicClient, walletClient, chain } = makeClients()
  const txs = []
  const calls = []

  await page.exposeFunction('__hawkRpc', async (method, params) => {
    calls.push(method)
    try {
      if (method === 'personal_sign') {
        const [data] = params
        const signature = await walletClient.signMessage({ account, message: { raw: data } })
        return { result: signature }
      }
      if (method === 'eth_sign') {
        const [, data] = params
        const signature = await walletClient.signMessage({ account, message: { raw: data } })
        return { result: signature }
      }
      if (method === 'eth_signTypedData_v4') {
        const [, json] = params
        const signature = await walletClient.signTypedData({
          account,
          ...(typeof json === 'string' ? JSON.parse(json) : json),
        })
        return { result: signature }
      }
      if (method === 'eth_sendTransaction') {
        const [tx] = params
        const req = {
          account,
          chain,
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
        }
        let hash
        try {
          hash = await walletClient.sendTransaction(req)
        } catch (e) {
          // RISKS.md: public RPC load-balances nonces across nodes — retry once
          if (/nonce too low|already known|replacement/i.test(String(e))) {
            await new Promise((r) => setTimeout(r, 3000))
            hash = await walletClient.sendTransaction(req)
          } else throw e
        }
        txs.push({ hash, to: tx.to })
        log(`  tx ${hash} -> ${tx.to}`)
        return { result: hash }
      }
      const result = await publicClient.request({ method, params })
      return { result }
    } catch (e) {
      return { __error: String(e?.shortMessage || e?.message || e).slice(0, 400), code: e?.code }
    }
  })

  const src = PROVIDER_SRC(`0x${CHAIN_ID.toString(16)}`, account.address)

  // Document-start injection into the MAIN world. page.addInitScript is useless here
  // (patchright runs it isolated), and a post-load page.evaluate is too late: the
  // wallet list's `installed` getters are evaluated as the app mounts, so a provider
  // that appears afterwards reads as "Metamask is not installed". CDP's
  // Page.addScriptToEvaluateOnNewDocument runs in the main world before page scripts.
  // patchright suppresses BOTH page.addInitScript (isolated world) and CDP
  // Page.addScriptToEvaluateOnNewDocument — verified during Task 15. The technique
  // that does work is rewriting the HTML document response and prepending an inline
  // <script>, which the browser runs in the main world before any app bundle.
  let cdpOk = false
  let injectError = null
  await page.route('**/*', async (route) => {
    const req = route.request()
    if (req.resourceType() !== 'document') return route.fallback()
    try {
      const resp = await route.fetch()
      const ct = resp.headers()['content-type'] || ''
      if (!ct.includes('text/html')) return route.fulfill({ response: resp })
      let html = await resp.text()
      // the app ships a CSP with a per-request nonce; an inline <script> without it
      // is silently blocked, so reuse the nonce Next.js already stamped on its own tags
      const nonce = html.match(/<script[^>]*\snonce="([^"]+)"/)?.[1]
      const tag = `<script${nonce ? ` nonce="${nonce}"` : ''}>${src}</script>`
      html = html.includes('<head>') ? html.replace('<head>', `<head>${tag}`) : tag + html
      const headers = { ...resp.headers() }
      delete headers['content-length']
      delete headers['content-encoding']
      cdpOk = true
      return route.fulfill({ status: resp.status(), headers, contentType: 'text/html; charset=utf-8', body: html })
    } catch (e) {
      injectError = String(e).slice(0, 200)
      return route.fallback()
    }
  })

  // fallback / top-up: main-world injection after load, repeated on navigation
  const inject = async () => page.evaluate(src).catch(() => {})

  return {
    account,
    address: account.address,
    publicClient,
    walletClient,
    chain,
    txs,
    calls,
    inject,
    get documentInjected() {
      return cdpOk
    },
    get injectError() {
      return injectError
    },
  }
}
