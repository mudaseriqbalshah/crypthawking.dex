#!/usr/bin/env node
/**
 * Wallet-connected UI acceptance harness — LIVE site (https://dex.cryptohawking.com).
 *
 * TESTNET ONLY (Base Sepolia, chainId 84532). Backed by viem + the deployer key in
 * the repo-root `.env` (PRIVATE_KEY). Never point this at mainnet.
 *
 * Why this exists separately from `wallet.mjs`: that harness runs under the
 * browser-automation skill, which drives **patchright** — a stealth Playwright fork
 * that suppresses both `page.addInitScript` (isolated world) and CDP
 * `Page.addScriptToEvaluateOnNewDocument`, so no provider can exist before the app
 * mounts and `walletsConfig`'s `installed` getter runs. Plain Playwright does not
 * suppress either, so here we inject at document-start into the main world and the
 * app's injected connector sees a real EIP-6963 provider.
 *
 * Playwright/viem are NOT repo dependencies — install them in a scratch dir and
 * point PW_DIR at it:
 *
 *   mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright viem
 *   npx playwright install chromium
 *   PW_DIR=/tmp/pw node scripts/acceptance/wallet-live.mjs connect swap faucet
 *
 * Flows: connect | swap | faucet | farm | netscan | probe   (default: connect/swap/faucet/farm)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const PW_DIR = process.env.PW_DIR
if (!PW_DIR) throw new Error('set PW_DIR to a dir with `npm i playwright viem` installed')
const req = createRequire(path.join(PW_DIR, 'package.json'))
const { chromium } = req('playwright')
const viem = req('viem')
const { privateKeyToAccount } = req('viem/accounts')
const { baseSepolia } = req('viem/chains')

const BASE = process.env.DEX_URL || 'https://dex.cryptohawking.com'
const CHAIN_ID = 84532
const RPCS = [
  process.env.RPC_URL || 'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
]
const SHOT_DIR = process.env.SHOT_DIR || '/tmp'

const log = (...a) => console.log(...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadPrivateKey() {
  const env = readFileSync(path.join(REPO, '.env'), 'utf8')
  const m = env.match(/^\s*(?:DEPLOYER_)?PRIVATE_KEY\s*=\s*"?([0-9a-fA-Fx]+)"?\s*$/m)
  if (!m) throw new Error('PRIVATE_KEY not found in repo-root .env')
  return m[1].startsWith('0x') ? m[1] : `0x${m[1]}`
}

const account = privateKeyToAccount(loadPrivateKey())
const transport = viem.fallback(RPCS.map((u) => viem.http(u)))
const publicClient = viem.createPublicClient({ chain: baseSepolia, transport })
const walletClient = viem.createWalletClient({ account, chain: baseSepolia, transport })

// ---------------------------------------------------------------- provider src
const PROVIDER_SRC = `
(() => {
  if (window.__hawkProviderInstalled) return
  window.__hawkProviderInstalled = true
  const CHAIN_ID = '0x14a34'
  const ACCOUNTS = ['__ADDRESS__']
  const listeners = {}
  const provider = {
    isMetaMask: true,
    _metamask: { isUnlocked: () => Promise.resolve(true) },
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
      if (method === 'wallet_getPermissions' || method === 'wallet_requestPermissions')
        return [{ parentCapability: 'eth_accounts' }]
      if (method === 'wallet_revokePermissions') return null
      // EIP-5792 probe — the app calls it on connect; a plain MetaMask-era wallet
      // answers with an empty capability set rather than throwing
      if (method === 'wallet_getCapabilities') return {}
      const res = await window.__hawkRpc(method, JSON.stringify(params))
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
    enable() { return this.request({ method: 'eth_requestAccounts' }) },
    on(e, fn) { (listeners[e] = listeners[e] || []).push(fn); return provider },
    once(e, fn) { return provider.on(e, fn) },
    addListener(e, fn) { return provider.on(e, fn) },
    removeListener(e, fn) { listeners[e] = (listeners[e] || []).filter((f) => f !== fn); return provider },
    removeAllListeners() { for (const k of Object.keys(listeners)) delete listeners[k]; return provider },
    emit(e, ...args) { for (const fn of listeners[e] || []) try { fn(...args) } catch (_) {} },
  }
  provider.providers = [provider]
  try {
    Object.defineProperty(window, 'ethereum', { value: provider, writable: true, configurable: true })
  } catch (e) { window.ethereum = provider }

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
  setTimeout(announce, 300)
  setTimeout(announce, 1500)
  window.addEventListener('load', () => { announce(); provider.emit('connect', { chainId: CHAIN_ID }) })
})()
`

// ---------------------------------------------------------------- node RPC bridge
const state = { txs: [], calls: [], errors: [], requests: [] }

async function rpc(method, paramsJson) {
  const params = JSON.parse(paramsJson || '[]')
  state.calls.push(method)
  try {
    if (method === 'personal_sign') {
      const [data] = params
      return { result: await walletClient.signMessage({ account, message: { raw: data } }) }
    }
    if (method === 'eth_sign') {
      const [, data] = params
      return { result: await walletClient.signMessage({ account, message: { raw: data } }) }
    }
    if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
      const [, json] = params
      const typed = typeof json === 'string' ? JSON.parse(json) : json
      return { result: await walletClient.signTypedData({ account, ...typed }) }
    }
    if (method === 'eth_sendTransaction') {
      const [tx] = params
      const send = () =>
        walletClient.sendTransaction({
          account,
          chain: baseSepolia,
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
        })
      let hash
      try {
        hash = await send()
      } catch (e) {
        // public RPC load-balances nonces across nodes — retry once
        if (/nonce|already known|replacement|underpriced/i.test(String(e))) {
          await sleep(4000)
          hash = await send()
        } else throw e
      }
      state.txs.push({ hash, to: tx.to })
      log(`    → tx ${hash}`)
      return { result: hash }
    }
    return { result: await publicClient.request({ method, params }) }
  } catch (e) {
    const msg = String(e?.shortMessage || e?.message || e).slice(0, 500)
    state.errors.push(`${method}: ${msg}`)
    log(`    ✗ rpc ${method}: ${msg}`)
    return { __error: msg, code: e?.code }
  }
}

// ---------------------------------------------------------------- browser helpers
async function newPage(context) {
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') state.errors.push(`console: ${m.text().slice(0, 200)}`)
  })
  // Every outbound request, so a run can assert on third-party dependencies
  // (see the `netscan` flow — no *.pancakeswap.* call may leave this fork).
  page.on('request', (r) => state.requests.push(r.url()))
  return page
}

async function shot(page, name) {
  const p = path.join(SHOT_DIR, `${name}.png`)
  await page.screenshot({ path: p, fullPage: false }).catch(() => {})
  log(`    shot ${p}`)
  return p
}

// the header chip renders the address truncated as `0x...5e95` — match the tail, not
// the `0x8DAF` head, which never appears in the DOM
const tail = account.address.slice(-4)

async function isConnected(page) {
  return page.evaluate(
    (s) => (document.body.innerText || '').toLowerCase().includes(`0x...${s}`.toLowerCase()),
    tail,
  )
}

/** Click a node whose trimmed text equals/contains `text`, searching the whole doc. */
async function clickText(page, text, { exact = false, timeout = 8000 } = {}) {
  const loc = page.getByText(text, { exact }).first()
  try {
    await loc.click({ timeout })
    return true
  } catch {
    return page.evaluate(
      ({ t, ex }) => {
        const nodes = [...document.querySelectorAll('button, div, a, span, li')]
        const hit = nodes.filter((e) => {
          const s = (e.textContent || '').trim()
          return ex ? s === t : s.includes(t)
        })
        const el = hit[hit.length - 1]
        if (!el) return false
        el.scrollIntoView({ block: 'center' })
        el.click()
        return true
      },
      { t: text, ex: exact },
    )
  }
}

// ---------------------------------------------------------------- flows
async function flowConnect(page, url = `${BASE}/swap`) {
  log(`\n[connect] ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(6000)

  const probe = await page.evaluate(() => ({
    hasEthereum: typeof window.ethereum !== 'undefined',
    isMetaMask: !!window.ethereum?.isMetaMask,
  }))
  log(`    provider present in page: ${JSON.stringify(probe)}`)
  if (!probe.hasEthereum) throw new Error('INJECTION FAILED: window.ethereum absent after load')

  if (await isConnected(page)) {
    log('    already connected')
    return { connected: true, already: true }
  }

  const btn = page.getByRole('button', { name: /connect wallet/i }).first()
  await btn.click({ timeout: 20000 })
  await page.waitForTimeout(3000)

  // Wallet entries render into #portal-root as styled <div> tiles, not <button>s, and
  // their labels are CSS-truncated ("Metama…"), so match on textContent and walk up to
  // the tile box, then drive a REAL mouse click at its centre (a synthetic .click() on
  // the inner label does not reach the tile's handler).
  const picked = await page.evaluate(() => {
    const root = document.getElementById('portal-root') || document.body
    const names = ['Metamask', 'MetaMask', 'Injected']
    for (const n of names) {
      const label = [...root.querySelectorAll('*')]
        .filter((e) => (e.textContent || '').trim() === n && e.children.length === 0)
        .pop()
      if (!label) continue
      let el = label
      for (let i = 0; i < 8 && el && el !== root; i++) {
        const r = el.getBoundingClientRect()
        if (r.width > 60 && r.height > 60) break
        el = el.parentElement
      }
      const r = (el || label).getBoundingClientRect()
      return { name: n, x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }
    return null
  })
  log(`    picked wallet entry: ${JSON.stringify(picked)}`)
  if (!picked) {
    const txt = await page.evaluate(() => (document.getElementById('portal-root')?.innerText || '').slice(0, 600))
    throw new Error(`no wallet entry in modal. portal text: ${txt}`)
  }
  await page.mouse.click(picked.x, picked.y)

  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500)
    if (await isConnected(page)) return { connected: true, picked: picked.name }
  }
  const head = await page.evaluate(() => (document.body.innerText || '').slice(0, 500).replace(/\n+/g, ' | '))
  log(`    not connected; body head: ${head}`)
  return { connected: false, picked: picked.name, head }
}

/**
 * Get to `path` with the wallet still connected.
 *
 * A full `page.goto` reload drops the session — wagmi's autoConnect does not re-adopt
 * our injected provider (no extension storage behind it), so the header falls back to
 * "Connect Wallet". Navigating in-app via the Next router keeps React/wagmi state, so
 * prefer clicking a matching <a href>; only fall back to goto + a fresh modal connect.
 */
async function ensureConnected(page, pathname) {
  const url = `${BASE}${pathname}`
  if (page.url().includes(pathname) && (await isConnected(page))) {
    log(`    already on ${pathname}, connected`)
    return true
  }
  const navigated = await mouseClick(
    page,
    (p) => {
      const a = [...document.querySelectorAll('a[href]')].filter((x) => {
        const h = x.getAttribute('href') || ''
        return h === p || h.startsWith(`${p}?`)
      })
      const el = a.find((x) => x.getBoundingClientRect().width > 0)
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    pathname,
  )
  if (navigated) {
    await page.waitForTimeout(9000)
    if (page.url().includes(pathname) && (await isConnected(page))) {
      log(`    in-app nav → ${pathname} (session kept)`)
      return true
    }
  }
  log(`    hard nav → ${url}`)
  const r = await flowConnect(page, url)
  return r.connected
}

/** Real mouse click at the centre of the first element matching `find` (page fn). */
async function mouseClick(page, find, arg) {
  const box = await page.evaluate(find, arg)
  if (!box) return false
  await page.mouse.click(box.x, box.y)
  return true
}

const boxOf = `(el) => { el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }`

async function flowSwap(page, { from = 'tUSDC', to = 'tUSDT', amount = '0.5' } = {}) {
  log(`\n[swap] ${amount} ${from} → ${to}`)
  // FINDING (live, 2026-08-05): picking a token on one side RESETS the other side to its
  // default (choose tUSDT for To and From snaps back to ETH; choose tUSDC for From and To
  // snaps back to HAWK), so the pair can never be set by two modal picks. Seed both sides
  // from the URL query instead — that path works and is what a shared swap link uses.
  const TOKENS = JSON.parse(readFileSync(path.join(REPO, 'packages/deployments/base-sepolia.json'), 'utf8')).tokens
  const addr = (s) => TOKENS[s] || s
  const url = `${BASE}/swap?inputCurrency=${addr(from)}&outputCurrency=${addr(to)}`
  const conn = await flowConnect(page, url)
  if (!conn.connected) throw new Error('wallet not connected on /swap')

  const pickToken = async (index, symbol) => {
    // currency-select buttons, in document order: input side then output side
    // Pick the currency button by GEOMETRY, not DOM order or ancestry. Probed shape of
    // the live panel (1440x1000): the two currency buttons read "ETHBase Sepolia" /
    // "HAWKBase Sepolia", w=139 h=46, each sitting ~18px below its amount input
    // (input[0] y=287 → button y=305; input[1] y=469 → button y=487). A flat
    // querySelectorAll order instead catches the language menu and the header network
    // picker, silently opening the wrong modal while the panel stays on ETH→HAWK.
    const opened = await mouseClick(
      page,
      (i) => {
        const input = [...document.querySelectorAll('input[inputmode="decimal"]')][i]
        if (!input) return null
        const iy = input.getBoundingClientRect().y
        const btns = [...document.querySelectorAll('button, div[role="button"]')]
          .filter((b) => {
            const t = (b.textContent || '').trim()
            const r = b.getBoundingClientRect()
            return (
              /^(Select a currency|ETH|tUSDC|tUSDT|HAWK|WETH|tDAI|tWBTC)/.test(t) &&
              t.length < 40 &&
              r.width > 80 &&
              r.width < 220 &&
              Math.abs(r.y - iy) < 60
            )
          })
          .sort((a, c) => Math.abs(a.getBoundingClientRect().y - iy) - Math.abs(c.getBoundingClientRect().y - iy))
        const el = btns[0]
        if (!el) return null
        el.scrollIntoView({ block: 'center' })
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      },
      index,
    )
    if (!opened) throw new Error(`no currency-select button beside amount input ${index}`)
    await page.waitForTimeout(3000)
    const title = await page.evaluate(
      () => (document.getElementById('portal-root')?.innerText || '').slice(0, 30).split('\n')[0],
    )
    log(`    token modal[${index}] title: ${title}`)
    const search = page.locator('input#token-search-input, input[placeholder*="Search"]').first()
    await search.fill(symbol, { timeout: 15000 })
    // The result list renders a spinner while the token list resolves, so poll for the
    // row. Click the symbol label with Playwright (a real trusted mouse event that
    // bubbles to the row's handler) — a synthetic el.click() does not select, and
    // clicking a computed row-box centre can land on padding and dismiss the modal
    // via its outside-click handler instead.
    const row = page.locator('#portal-root').getByText(symbol, { exact: true }).last()
    let ok = false
    for (let i = 0; i < 12 && !ok; i++) {
      try {
        await row.click({ timeout: 5000 })
        ok = true
      } catch {
        await page.waitForTimeout(2000)
      }
    }
    if (!ok) throw new Error(`token ${symbol} not found in list`)
    await page.waitForTimeout(3000)
    const still = await page.evaluate(() => !!document.getElementById('token-search-input'))
    if (still) throw new Error(`token modal still open after selecting ${symbol}`)
  }

  // The modal closing is NOT proof the token changed — an errant click on the modal
  // body dismisses it via the outside-click handler and leaves the panel untouched.
  // Assert against the currency button and retry once.
  // Read the selected pair off the rendered panel text ("<SYM>\nBase Sepolia", in From
  // then To order). Geometry/DOM-order lookups proved unreliable here — they matched the
  // laid-out-but-offscreen language menu and reported a token the panel never showed.
  const panelSymbols = () =>
    page.evaluate(() => {
      const t = document.body.innerText || ''
      const re = /\n(ETH|WETH|HAWK|tUSDC|tUSDT|tDAI|tWBTC)\nBase Sepolia/g
      return [...t.matchAll(re)].map((m) => m[1])
    })

  // FINDING (live, 2026-08-05): changing the OUTPUT token resets the INPUT token back to
  // the ETH default — picking tUSDC then tUSDT lands on ETH→tUSDT, not tUSDC→tUSDT. So
  // set the output side first, then the input side, and loop until the pair sticks.
  let pair = []
  for (let round = 0; round < 6; round++) {
    pair = await panelSymbols()
    if (pair[0] === from && pair[1] === to) break
    await page.waitForTimeout(3000)
  }
  log(`    pair from URL: ${JSON.stringify(pair)} (want ${from}→${to})`)
  if (pair[0] !== from || pair[1] !== to) {
    await shot(page, 'swap-pair-stuck')
    throw new Error(`pair stuck on ${JSON.stringify(pair)}, wanted ${from}→${to}`)
  }

  const amtInput = page.locator('input[inputmode="decimal"], input.token-amount-input').first()
  await amtInput.fill(amount, { timeout: 15000 })
  await page.waitForTimeout(10000) // quote + route

  const quote = await page.evaluate(() => {
    const ins = [...document.querySelectorAll('input[inputmode="decimal"]')]
    return ins.map((i) => i.value)
  })
  log(`    inputs: ${JSON.stringify(quote)}`)
  const panel = await page.evaluate(() => {
    const t = document.body.innerText || ''
    const i = t.indexOf('From')
    return t.slice(i, i + 500).replace(/\n+/g, ' | ')
  })
  log(`    panel: ${panel}`)
  await shot(page, 'swap-before-cta')

  // approve/permit if asked, then Swap, then Confirm Swap in the modal. The CTA label
  // changes as the state machine advances, so re-read it every round.
  const before = state.txs.length
  const CTA = /^(Enable|Approve|Permit|Swap|Swap Anyway|Confirm Swap|Confirm)/i
  for (let round = 0; round < 8; round++) {
    const cta = await page.evaluate((re) => {
      const rx = new RegExp(re, 'i')
      // prefer a modal CTA if the confirm modal is up
      const scopes = [document.getElementById('portal-root'), document].filter(Boolean)
      for (const s of scopes) {
        const b = [...s.querySelectorAll('button')]
          .filter((x) => !x.disabled && rx.test((x.textContent || '').trim()))
          // the "Swap | TWAP | Limit" TAB also reads "Swap" and sits above the form —
          // clicking it RESETS the panel. Probed widths: tab w=129, commit button
          // w=446. Require a wide box and take the lowest match.
          .filter((x) => x.getBoundingClientRect().width > 300)
          .sort((a, c) => c.getBoundingClientRect().top - a.getBoundingClientRect().top)
        if (!b.length) continue
        const el = b[0]
        el.scrollIntoView({ block: 'center' })
        const r = el.getBoundingClientRect()
        return { text: (el.textContent || '').trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }
      return null
    }, CTA.source)
    if (!cta) {
      // the commit button stays disabled ("Enter an amount" / "Searching For The Best
      // Price") while the router recomputes after a token change — poll before quitting
      const label = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.getBoundingClientRect().width > 300)
        return b ? `${(b.textContent || '').trim()}${b.disabled ? ' (disabled)' : ''}` : 'none'
      })
      log(`    cta[${round}] → none; commit button reads: ${label}`)
      if (round < 5) {
        await page.waitForTimeout(10000)
        continue
      }
      break
    }
    log(`    cta[${round}] → ${cta.text}`)
    await page.mouse.click(cta.x, cta.y)
    await page.waitForTimeout(10000)
    const modal = await page.evaluate(() =>
      (document.getElementById('portal-root')?.innerText || '').slice(0, 400).replace(/\n+/g, ' | '),
    )
    log(`    after cta[${round}] portal: ${modal || '(empty)'}`)
    if (state.txs.length > before && /^(Confirm|Swap)/i.test(cta.text)) break
  }

  await page.waitForTimeout(6000)
  const bodyText = await page.evaluate(() => (document.body.innerText || '').slice(0, 1200))
  const newTxs = state.txs.slice(before)
  return { txs: newTxs, bodyText }
}

async function flowFaucet(page) {
  log(`\n[faucet] ${BASE}/faucet`)
  // the Wrap/Claim buttons are `disabled={!account}`, so the connection guard is
  // load-bearing here, not cosmetic
  if (!(await ensureConnected(page, '/faucet'))) throw new Error('wallet not connected on /faucet')
  const before = state.txs.length

  const text = await page.evaluate(() => (document.body.innerText || '').slice(0, 2000))
  log(`    page text head: ${text.slice(0, 300).replace(/\n+/g, ' | ')}`)

  // WETH wrap card: views/Faucet renders <Input placeholder="0.01"> + "Wrap ETH"
  const filled = await page.evaluate(() => {
    const ins = [...document.querySelectorAll('input')].filter(
      (i) => i.type !== 'checkbox' && !/search/i.test(i.placeholder || ''),
    )
    const el = ins.find((i) => (i.placeholder || '').startsWith('0.0')) || ins[ins.length - 1]
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '0.001')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })
  log(`    amount filled: ${filled}`)
  await page.waitForTimeout(1500)

  const target = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(
      (x) => !x.disabled && /wrap eth|^claim/i.test((x.textContent || '').trim()),
    )
    if (!b[0]) {
      const all = [...document.querySelectorAll('button')].map((x) => `${(x.textContent || '').trim()}${x.disabled ? '(disabled)' : ''}`)
      return { err: `no enabled Wrap/Claim button. buttons: ${all.slice(0, 20).join(' / ')}` }
    }
    b[0].scrollIntoView({ block: 'center' })
    const r = b[0].getBoundingClientRect()
    return { text: (b[0].textContent || '').trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  log(`    clicked: ${JSON.stringify(target)}`)
  if (target.err) throw new Error(target.err)
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(20000)
  return { clicked: target.text, txs: state.txs.slice(before) }
}

async function flowFarm(page) {
  log(`\n[farm] ${BASE}/farms`)
  if (!(await ensureConnected(page, '/farms'))) throw new Error('wallet not connected on /farms')
  await page.waitForTimeout(10000)
  const before = state.txs.length
  const target = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(
      (x) => !x.disabled && /^(Harvest|Collect)/i.test((x.textContent || '').trim()),
    )
    if (!b[0]) {
      const all = [...document.querySelectorAll('button')].map((x) => (x.textContent || '').trim()).filter(Boolean)
      return { err: `no enabled Harvest button. buttons: ${all.slice(0, 25).join(' / ')}` }
    }
    b[0].scrollIntoView({ block: 'center' })
    const r = b[0].getBoundingClientRect()
    return { text: (b[0].textContent || '').trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  log(`    clicked: ${JSON.stringify(target)}`)
  if (target.err) throw new Error(target.err)
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(12000)
  // farm rows open a confirm modal for harvest
  await mouseClick(page, () => {
    const root = document.getElementById('portal-root')
    if (!root) return null
    const b = [...root.querySelectorAll('button')].filter(
      (x) => !x.disabled && /^(Confirm|Harvest)/i.test((x.textContent || '').trim()),
    )
    if (!b[0]) return null
    const r = b[0].getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.waitForTimeout(15000)
  return { clicked: target.text, txs: state.txs.slice(before) }
}

/**
 * Connected-state third-party dependency scan. Walks the surfaces that pull remote
 * balances/prices (swap panel, token-select modal, wallet modal) and reports every
 * request that left for a pancakeswap host. Expected result on 84532: none.
 */
async function flowNetscan(page) {
  log('\n[netscan] connected-state third-party requests')
  const TOKENS = JSON.parse(readFileSync(path.join(REPO, 'packages/deployments/base-sepolia.json'), 'utf8')).tokens
  await page.goto(`${BASE}/swap?inputCurrency=${TOKENS.tUSDC}&outputCurrency=${TOKENS.tUSDT}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(12000)

  // token-select modal → useAllTokenBalances
  await page
    .locator('.open-currency-select-button')
    .first()
    .click({ timeout: 15000 })
    .catch(() => log('    (token select button not clickable)'))
  await page.waitForTimeout(6000)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)

  // wallet modal → useAddressBalance. The header chip is a styled div, so click its
  // centre with a real mouse event rather than a locator on the truncated label.
  const chip = await page.evaluate((t) => {
    const want = `0x...${t}`.toLowerCase()
    const hits = [...document.querySelectorAll('button, div, span')].filter((e) =>
      (e.textContent || '').trim().toLowerCase().includes(want),
    )
    // innermost match that is still a real, visible box
    const hit = hits.reverse().find((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 40 && r.height > 10
    })
    if (!hit) return null
    const r = hit.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, tail)
  if (chip) await page.mouse.click(chip.x, chip.y)
  else log('    (address chip not found)')
  await page.waitForTimeout(10000)

  const pancake = [...new Set(state.requests.filter((u) => /(^|\.)pancakeswap\./i.test(new URL(u).hostname)))]
  log(`    total requests: ${state.requests.length}`)
  log(`    pancakeswap requests: ${pancake.length}`)
  for (const u of pancake) log(`      ${u}`)
  return { txs: [], totalRequests: state.requests.length, pancakeRequests: pancake }
}

/** Dump the swap panel's clickable elements — used to (re)derive selectors. */
async function flowProbe(page) {
  log(`\n[probe] ${BASE}/swap`)
  if (!(await ensureConnected(page, '/swap'))) throw new Error('not connected')
  const dump = await page.evaluate(() => {
    const out = []
    const inputs = [...document.querySelectorAll('input[inputmode="decimal"]')]
    out.push(`decimal inputs: ${inputs.length}`)
    inputs.forEach((inp, i) => {
      const r = inp.getBoundingClientRect()
      out.push(`  input[${i}] y=${Math.round(r.y)} value=${inp.value}`)
    })
    const all = [...document.querySelectorAll('button, div[role="button"], [class*="Button"]')]
    for (const el of all) {
      const t = (el.textContent || '').trim()
      const r = el.getBoundingClientRect()
      if (!t || t.length > 40 || r.width < 20) continue
      out.push(`  ${el.tagName}[${el.getAttribute('role') || ''}] "${t}" x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}`)
    }
    return out.join('\n')
  })
  log(dump)
  return { txs: [] }
}

async function receipt(hash) {
  try {
    const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 90000 })
    return { status: r.status, gasUsed: String(r.gasUsed) }
  } catch (e) {
    return { status: 'unknown', error: String(e?.shortMessage || e).slice(0, 200) }
  }
}

// ---------------------------------------------------------------- main
async function main() {
  const want = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const flows = want.length ? want : ['connect', 'swap', 'faucet', 'farm']
  log(`account ${account.address}`)
  log(`balance ${viem.formatEther(await publicClient.getBalance({ address: account.address }))} ETH`)

  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.exposeFunction('__hawkRpc', rpc)
  await context.addInitScript(PROVIDER_SRC.replace('__ADDRESS__', account.address))

  const results = {}
  const page = await newPage(context)
  try {
    const conn = await flowConnect(page)
    results.connect = conn
    log(`  connect: ${conn.connected ? 'PASS' : 'FAIL'}`)
    if (!conn.connected) await shot(page, 'fail-connect')

    if (conn.connected) {
      for (const f of flows) {
        if (f === 'connect') continue
        try {
          const fn = { swap: flowSwap, faucet: flowFaucet, farm: flowFarm, probe: flowProbe, netscan: flowNetscan }[f]
          if (!fn) continue
          const r = await fn(page)
          for (const t of r.txs || []) t.receipt = await receipt(t.hash)
          results[f] = r
          const ok = f === 'netscan' ? r.pancakeRequests?.length === 0 : (r.txs || []).some((t) => t.receipt?.status === 'success')
          log(`  ${f}: ${ok ? 'PASS' : 'FAIL'} ${(r.txs || []).map((t) => t.hash).join(', ')}`)
          if (!ok) await shot(page, `fail-${f}`)
        } catch (e) {
          results[f] = { error: String(e?.message || e).slice(0, 600) }
          log(`  ${f}: FAIL ${results[f].error}`)
          await shot(page, `fail-${f}`)
        }
      }
    }
  } finally {
    log('\n===== RESULT =====')
    log(JSON.stringify({ address: account.address, results, txs: state.txs, rpcMethods: [...new Set(state.calls)] }, null, 2))
    log('\n===== ERRORS =====')
    log([...new Set(state.errors)].slice(0, 40).join('\n'))
    await browser.close()
  }
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
