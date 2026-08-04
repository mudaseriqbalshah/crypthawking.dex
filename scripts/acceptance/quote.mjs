/**
 * Task 15 acceptance — focused /swap quote probe.
 *
 * The multi-page smoke (smoke.mjs) allows 45s for a quote; on a cold Next dev
 * server with no SmartRouter quote API deployed (every quote is an on-chain
 * multicall against QuoterV2) that is sometimes not enough. This script waits
 * longer and reports the swap form's own state so a miss can be diagnosed.
 *
 *   node <skill>/browser.mjs http://localhost:3000/swap --script scripts/acceptance/quote.mjs --timeout 180000
 */
export default async function run(page) {
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)))
  await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach((e) => e.remove()))
  await page.waitForTimeout(12000)

  const inputs = page.locator('input[inputmode="decimal"], input[placeholder="0.00"]')
  const n = await inputs.count()
  if (n < 2) return { error: 'swap inputs not found', inputCount: n }

  await inputs.first().fill('1')

  let quoted = false
  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    const out = await inputs.nth(1).inputValue().catch(() => '')
    if (out && Number(out) > 0) {
      quoted = true
      break
    }
    await page.waitForTimeout(2500)
  }

  const amountOut = await inputs.nth(1).inputValue().catch(() => null)
  const body = await page.evaluate(() => (document.body.innerText || '').replace(/\n+/g, ' | ').slice(0, 900))
  return { quoted, amountOut, body, consoleErrors: [...new Set(errs)].slice(0, 10) }
}
