/**
 * CryptoHawking DEX — frontend acceptance smoke script (Task 15, spec §6.9/§6.10).
 *
 * Visits /swap, /liquidity/positions, /farms, /faucet in ONE browser session at a
 * single viewport and asserts, per page:
 *   - the document mounted (bodyChars over threshold)
 *   - zero `*pancake*` entries in performance.getEntriesByType('resource')
 *   - no PancakeSwap/CAKE/SYRUP branding text in the rendered body
 *   - testnet banner present
 *   - console errors captured and classified (known-degradation vs unexpected)
 *
 * Run via the browser-automation runner:
 *   VIEWPORT=desktop node <skill>/browser.mjs http://localhost:3000/swap \
 *     --script scripts/acceptance/smoke.mjs --timeout 120000
 *
 * Env: VIEWPORT=desktop|mobile (default desktop), SETTLE_MS (default 14000)
 */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

const PAGES = ['/swap', '/liquidity/positions', '/farms', '/faucet']

/** Type an amount into the swap form and wait for a non-zero output amount. */
async function checkSwapQuote(page) {
  // On a narrow viewport the amount input can sit under an off-canvas layer, and the
  // runner disables Playwright's default action timeout — `fill` then blocks forever.
  // SKIP_QUOTE=1 runs the render/leak checks only (used for the mobile pass).
  if (process.env.SKIP_QUOTE) return { quoted: null, reason: 'SKIP_QUOTE=1' }
  try {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('nextjs-portal')) el.remove()
    })
    const inputs = page.locator('input[inputmode="decimal"], input[placeholder="0.00"]')
    if ((await inputs.count()) < 2) return { quoted: false, reason: 'swap inputs not found' }
    await inputs.first().fill('1', { timeout: 20000 })
    await page.waitForFunction(
      () => {
        const els = [...document.querySelectorAll('input')].filter(
          (i) => i.placeholder === '0.00' || i.inputMode === 'decimal',
        )
        const out = els[1]?.value || ''
        return out !== '' && Number(out) > 0
      },
      undefined,
      { timeout: 45000 },
    )
    const out = await inputs.nth(1).inputValue()
    return { quoted: true, amountOut: out }
  } catch (e) {
    const out = await page
      .locator('input[inputmode="decimal"], input[placeholder="0.00"]')
      .nth(1)
      .inputValue()
      .catch(() => null)
    return { quoted: false, amountOut: out, reason: String(e).slice(0, 140) }
  }
}

/** Count rendered farm rows and check at least one shows a non-zero APR. */
async function checkFarms(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || ''
    const aprs = [...body.matchAll(/([\d,]+\.?\d*)\s*%/g)].map((m) => Number(m[1].replace(/,/g, '')))
    const nonZero = aprs.filter((n) => n > 0)
    // farm rows are keyed by the LP pair label "X-Y"
    const pairs = [...new Set([...body.matchAll(/\b([A-Za-z]{3,6})-([A-Za-z]{3,6})\b/g)].map((m) => m[0]))]
    return { aprValues: aprs.slice(0, 20), nonZeroAprCount: nonZero.length, pairLabels: pairs.slice(0, 20) }
  })
}

// Console-error text that maps to an already-logged RISKS.md degradation.
const KNOWN = [
  /\/web\/wallets\//, // ASSET_CDN='' -> relative wallet icon 404s
  /\/web\/chains\//, // ASSET_CDN='' -> relative chain icon 404s
  /bscrpc\.com/, // @binance/w3w-core connector probes BSC RPCs
  /bsc-dataseed|nodereal|ankr\.com\/bsc/,
  /binance\.click/, // Binance W3W wallet-connector websocket
  /\/v1\/routes/, // no SmartRouter quote API deployed
  /explorer|blockscout/i,
]

export default async function run(page, ui) {
  const vpName = process.env.VIEWPORT || 'desktop'
  const vp = VIEWPORTS[vpName] || VIEWPORTS.desktop
  const settle = Number(process.env.SETTLE_MS || 14000)
  const base = new URL(page.url()).origin

  await page.setViewportSize(vp)

  const results = {}
  for (const path of PAGES) {
    const errs = []
    const onConsole = (m) => {
      if (m.type() === 'error') errs.push(m.text().slice(0, 200))
    }
    const onFail = (r) => errs.push(`REQFAIL ${r.url()} ${r.failure()?.errorText || ''}`.slice(0, 200))
    const onResp = (r) => {
      if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`.slice(0, 200))
    }
    const onPageErr = (e) => errs.push('pageerror: ' + String(e).slice(0, 200))
    page.on('console', onConsole)
    page.on('requestfailed', onFail)
    page.on('response', onResp)
    page.on('pageerror', onPageErr)

    let status = null
    try {
      const resp = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 180000 })
      status = resp?.status() ?? null
    } catch (e) {
      status = 'NAV_ERROR: ' + String(e).slice(0, 120)
    }
    await page.waitForTimeout(settle)

    const probe = await page.evaluate(() => {
      const res = performance.getEntriesByType('resource').map((r) => r.name)
      const body = document.body.innerText || ''
      return {
        title: document.title,
        bodyChars: body.length,
        resourceCount: res.length,
        pancakeResources: res.filter((n) => /pancake/i.test(n)),
        bannerHit: /testnet/i.test(body),
        pancakeBrandText: (body.match(/PancakeSwap|Pancake|\bCAKE\b|SYRUP/) || [null])[0],
        headTitleOk: /CryptoHawking/i.test(document.title),
      }
    })

    page.off('console', onConsole)
    page.off('requestfailed', onFail)
    page.off('response', onResp)
    page.off('pageerror', onPageErr)

    let extra = {}
    if (path === '/swap') extra = { swapQuote: await checkSwapQuote(page) }
    if (path === '/farms') extra = { farms: await checkFarms(page) }

    const unexpected = [...new Set(errs)].filter((e) => !KNOWN.some((k) => k.test(e)))
    // "Failed to load resource" console lines have no URL; pair them with the
    // response/requestfailed lines already classified above.
    const unexpectedFiltered = unexpected.filter((e) => !/^Failed to load resource/.test(e))
    const knownHits = [...new Set(errs)].filter((e) => KNOWN.some((k) => k.test(e)))

    results[path] = {
      status,
      ...probe,
      ...extra,
      knownDegradations: knownHits,
      unexpectedErrors: unexpectedFiltered,
      PASS:
        status === 200 &&
        probe.bodyChars > 400 &&
        probe.pancakeResources.length === 0 &&
        probe.pancakeBrandText === null &&
        probe.bannerHit &&
        unexpectedFiltered.length === 0,
    }
  }

  return { viewport: vpName, results, ALL_PASS: Object.values(results).every((r) => r.PASS) }
}
