/**
 * Task 15 acceptance — script-driven on-chain flows (spec §6.3, §6.5, §6.6, §6.7, §6.8).
 *
 * TESTNET ONLY (Base Sepolia, chainId 84532). Uses the deployer key from the
 * repo-root .env via scripts/acceptance/wallet.mjs.
 *
 * These are the FALLBACK path: the UI-driven equivalents could not be exercised
 * because the headless browser runner (patchright) suppresses document-start
 * provider injection — see task-15-report.md. Every call below goes through the
 * exact same contracts and function selectors the frontend calls.
 *
 *   node scripts/acceptance/onchain.mjs
 *
 * Prints a JSON record of every tx hash. Idempotent-ish: amounts are dust.
 */
import { makeClients, viem } from './wallet.mjs'

// viem is resolved through the vendored frontend workspace (see wallet.mjs)
const { parseAbi } = viem

const A = {
  WETH: '0x4200000000000000000000000000000000000006',
  HAWK: '0x2843bABb7557CD51e8007F8D2a960457c734C570',
  tUSDC: '0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2',
  tUSDT: '0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988',
  Faucet: '0x7264a007e40E52b767B1Ec749baf5Ae1860B113f',
  v2Router: '0x57B76A5a7abAF54Ba7f88b402863CD313667B380',
  v3SwapRouter: '0x4f8dBB1545F49CBfDeC3CC3693548f7a1FAEf17D',
  v3NPM: '0x85d440B2Bf52243239bb35D8BCeA865596cDc371',
  v3PoolUsdcUsdt: '0xa105b11344d43De4e1e97C0f55f1BA91BB7152ec',
  masterChef: '0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963',
  lpHawkWeth: '0xd4eAAe265c051f338cB01F99116647A19F31e4C3',
  lpUsdcUsdt: '0x0972d080e24b67232A8A438D48C507fE6A9DB8b4',
}

const erc20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function deposit() payable',
])
const v2Router = parseAbi([
  'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns (uint256[])',
  'function addLiquidity(address tokenA,address tokenB,uint256 amountADesired,uint256 amountBDesired,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) returns (uint256,uint256,uint256)',
  'function removeLiquidity(address tokenA,address tokenB,uint256 liquidity,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) returns (uint256,uint256)',
])
const v3Router = parseAbi([
  'struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }',
  'function exactInputSingle(ExactInputSingleParams params) payable returns (uint256 amountOut)',
])
const npm = parseAbi([
  'struct MintParams { address token0; address token1; uint24 fee; int24 tickLower; int24 tickUpper; uint256 amount0Desired; uint256 amount1Desired; uint256 amount0Min; uint256 amount1Min; address recipient; uint256 deadline; }',
  'function mint(MintParams params) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)',
  'struct CollectParams { uint256 tokenId; address recipient; uint128 amount0Max; uint128 amount1Max; }',
  'function collect(CollectParams params) payable returns (uint256 amount0,uint256 amount1)',
  'struct DecreaseLiquidityParams { uint256 tokenId; uint128 liquidity; uint256 amount0Min; uint256 amount1Min; uint256 deadline; }',
  'function decreaseLiquidity(DecreaseLiquidityParams params) payable returns (uint256 amount0,uint256 amount1)',
  'function positions(uint256 tokenId) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
])
const pool = parseAbi(['function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint32,bool)'])
const chef = parseAbi([
  'function deposit(uint256 _pid,uint256 _amount)',
  'function withdraw(uint256 _pid,uint256 _amount)',
  'function pendingCake(uint256 _pid,address _user) view returns (uint256)',
])
const faucet = parseAbi([
  'function claim()',
  'function lastClaim(address) view returns (uint256)',
  'function cooldown() view returns (uint256)',
])

const { account, chain, publicClient, walletClient } = makeClients()
const me = account.address
const results = []
const dl = () => BigInt(Math.floor(Date.now() / 1000) + 1800)

function log(...a) {
  console.log(...a)
}

async function send(label, req) {
  try {
    let hash
    try {
      hash = await walletClient.writeContract({ ...req, account, chain })
    } catch (e) {
      // RISKS.md: sepolia.base.org load-balances nonces across nodes — retry once
      if (/nonce too low|already known|replacement transaction/i.test(String(e))) {
        log(`  [retry after nonce race] ${label}`)
        await new Promise((r) => setTimeout(r, 4000))
        hash = await walletClient.writeContract({ ...req, account, chain })
      } else throw e
    }
    const rec = await publicClient.waitForTransactionReceipt({ hash, timeout: 120000 })
    results.push({ label, hash, status: rec.status })
    log(`  ok  ${label}  ${hash}  (${rec.status})`)
    return rec
  } catch (e) {
    const msg = String(e?.shortMessage || e?.message || e).slice(0, 250)
    results.push({ label, error: msg })
    log(`  FAIL ${label}: ${msg}`)
    return null
  }
}

async function ensureAllowance(token, spender, amount) {
  const cur = await publicClient.readContract({ address: token, abi: erc20, functionName: 'allowance', args: [me, spender] })
  if (cur >= amount) return
  await send(`approve ${token.slice(0, 8)} -> ${spender.slice(0, 8)}`, {
    address: token,
    abi: erc20,
    functionName: 'approve',
    args: [spender, 2n ** 255n],
  })
}

async function main() {
  log(`acceptance runner — account ${me} on chain ${chain.id}`)

  // ---- §6.8 faucet: WETH wrap 0.001 (the faucet page's wrap action) ----
  log('\n[1] faucet page — wrap 0.001 ETH -> WETH')
  await send('WETH.deposit 0.001', {
    address: A.WETH,
    abi: erc20,
    functionName: 'deposit',
    args: [],
    value: 1000000000000000n,
  })

  // ---- §6.8 faucet claim ----
  log('\n[2] faucet claim()')
  try {
    await publicClient.simulateContract({ address: A.Faucet, abi: faucet, functionName: 'claim', account: me })
    await send('Faucet.claim()', { address: A.Faucet, abi: faucet, functionName: 'claim', args: [] })
  } catch (e) {
    const msg = String(e?.shortMessage || e).slice(0, 200)
    results.push({ label: 'Faucet.claim() [deployer]', skipped: msg })
    log(`  skipped (expected cooldown): ${msg}`)
    // prove the path is live from an address that has never claimed
    const fresh = '0x1111111111111111111111111111111111111111'
    try {
      await publicClient.simulateContract({ address: A.Faucet, abi: faucet, functionName: 'claim', account: fresh })
      results.push({ label: 'Faucet.claim() simulated from unclaimed address', ok: true })
      log('  claim() simulates cleanly from an unclaimed address -> path live')
    } catch (e2) {
      results.push({ label: 'Faucet.claim() simulated from unclaimed address', error: String(e2?.shortMessage || e2).slice(0, 200) })
    }
  }

  // ---- §6.3 v2 swap tUSDC -> tUSDT ----
  log('\n[2b] v2 swap tUSDC -> tUSDT (HawkingRouter.swapExactTokensForTokens)')
  const amtUsdc = 1000000n // 1 tUSDC (6dp)
  await ensureAllowance(A.tUSDC, A.v2Router, amtUsdc)
  const usdtBefore = await publicClient.readContract({ address: A.tUSDT, abi: erc20, functionName: 'balanceOf', args: [me] })
  await send('v2 swap tUSDC->tUSDT', {
    address: A.v2Router,
    abi: v2Router,
    functionName: 'swapExactTokensForTokens',
    args: [amtUsdc, 0n, [A.tUSDC, A.tUSDT], me, dl()],
  })
  const usdtAfter = await publicClient.readContract({ address: A.tUSDT, abi: erc20, functionName: 'balanceOf', args: [me] })
  log(`  tUSDT out: ${usdtAfter - usdtBefore}`)
  results.push({ label: 'v2 tUSDC->tUSDT output (raw tUSDT)', value: String(usdtAfter - usdtBefore) })

  // ---- §6.3 v3 swap WETH -> tUSDC ----
  log('\n[3] v3 swap WETH -> tUSDC (SwapRouter.exactInputSingle, fee 500)')
  const amtWeth = 200000000000000n // 0.0002 WETH
  await ensureAllowance(A.WETH, A.v3SwapRouter, amtWeth)
  const usdcBefore = await publicClient.readContract({ address: A.tUSDC, abi: erc20, functionName: 'balanceOf', args: [me] })
  await send('v3 SwapRouter WETH->tUSDC', {
    address: A.v3SwapRouter,
    abi: v3Router,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: A.WETH,
        tokenOut: A.tUSDC,
        fee: 500,
        recipient: me,
        deadline: dl(),
        amountIn: amtWeth,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })
  const usdcAfter = await publicClient.readContract({ address: A.tUSDC, abi: erc20, functionName: 'balanceOf', args: [me] })
  log(`  tUSDC out: ${usdcAfter - usdcBefore}`)
  results.push({ label: 'v3 WETH->tUSDC output (raw tUSDC)', value: String(usdcAfter - usdcBefore) })

  // ---- §6.5 v2 add + remove liquidity ----
  log('\n[4] v2 add + remove liquidity (tUSDC/tUSDT)')
  const addAmt = 1000000n // 1 token each (6dp)
  await ensureAllowance(A.tUSDC, A.v2Router, addAmt)
  await ensureAllowance(A.tUSDT, A.v2Router, addAmt)
  const lpBefore = await publicClient.readContract({ address: A.lpUsdcUsdt, abi: erc20, functionName: 'balanceOf', args: [me] })
  await send('v2 addLiquidity tUSDC/tUSDT', {
    address: A.v2Router,
    abi: v2Router,
    functionName: 'addLiquidity',
    args: [A.tUSDC, A.tUSDT, addAmt, addAmt, 0n, 0n, me, dl()],
  })
  const lpAfter = await publicClient.readContract({ address: A.lpUsdcUsdt, abi: erc20, functionName: 'balanceOf', args: [me] })
  const minted = lpAfter - lpBefore
  log(`  LP minted: ${minted}`)
  results.push({ label: 'v2 LP minted', value: String(minted) })
  if (minted > 0n) {
    await ensureAllowance(A.lpUsdcUsdt, A.v2Router, minted)
    await send('v2 removeLiquidity tUSDC/tUSDT', {
      address: A.v2Router,
      abi: v2Router,
      functionName: 'removeLiquidity',
      args: [A.tUSDC, A.tUSDT, minted, 0n, 0n, me, dl()],
    })
  }

  // ---- §6.6 v3 mint position + collect ----
  log('\n[5] v3 mint position + collect (tUSDC/tUSDT fee 100)')
  const [, tick] = await publicClient.readContract({ address: A.v3PoolUsdcUsdt, abi: pool, functionName: 'slot0' })
  const spacing = 1
  const centre = Math.floor(Number(tick) / spacing) * spacing
  const lower = centre - 20
  const upper = centre + 20
  const mintAmt = 1000000n
  await ensureAllowance(A.tUSDC, A.v3NPM, mintAmt)
  await ensureAllowance(A.tUSDT, A.v3NPM, mintAmt)
  const [t0, t1] = A.tUSDC.toLowerCase() < A.tUSDT.toLowerCase() ? [A.tUSDC, A.tUSDT] : [A.tUSDT, A.tUSDC]
  const mintRec = await send('v3 NPM.mint', {
    address: A.v3NPM,
    abi: npm,
    functionName: 'mint',
    args: [
      {
        token0: t0,
        token1: t1,
        fee: 100,
        tickLower: lower,
        tickUpper: upper,
        amount0Desired: mintAmt,
        amount1Desired: mintAmt,
        amount0Min: 0n,
        amount1Min: 0n,
        recipient: me,
        deadline: dl(),
      },
    ],
  })
  let tokenId = null
  if (mintRec) {
    // IncreaseLiquidity(tokenId,...) — tokenId is the first indexed topic of the
    // NPM's Transfer(from=0, to=me, tokenId) log
    for (const l of mintRec.logs) {
      if (l.address.toLowerCase() === A.v3NPM.toLowerCase() && l.topics.length === 4) {
        tokenId = BigInt(l.topics[3])
        break
      }
    }
  }
  log(`  tokenId: ${tokenId}`)
  results.push({ label: 'v3 position tokenId', value: String(tokenId) })
  if (tokenId !== null) {
    await send('v3 NPM.collect', {
      address: A.v3NPM,
      abi: npm,
      functionName: 'collect',
      args: [{ tokenId, recipient: me, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }],
    })
  }

  // ---- §6.7 farms: stake + harvest (MasterChef v1, pid 1 HAWK/WETH LP) ----
  log('\n[6] farms — MasterChef pid 1 stake + harvest')
  const lpBal = await publicClient.readContract({ address: A.lpHawkWeth, abi: erc20, functionName: 'balanceOf', args: [me] })
  log(`  wallet HAWK-WETH LP: ${lpBal}`)
  if (lpBal > 0n) {
    const stake = lpBal / 100n > 0n ? lpBal / 100n : lpBal
    await ensureAllowance(A.lpHawkWeth, A.masterChef, stake)
    await send('MasterChef.deposit(1, stake)', {
      address: A.masterChef,
      abi: chef,
      functionName: 'deposit',
      args: [1n, stake],
    })
    const pending = await publicClient.readContract({ address: A.masterChef, abi: chef, functionName: 'pendingCake', args: [1n, me] })
    log(`  pending HAWK: ${pending}`)
    results.push({ label: 'MasterChef pid1 pending HAWK after stake', value: String(pending) })
    // harvest = deposit(pid, 0) in classic MasterChef
    await send('MasterChef.deposit(1, 0) [harvest]', {
      address: A.masterChef,
      abi: chef,
      functionName: 'deposit',
      args: [1n, 0n],
    })
    await send('MasterChef.withdraw(1, stake) [unstake]', {
      address: A.masterChef,
      abi: chef,
      functionName: 'withdraw',
      args: [1n, stake],
    })
  } else {
    results.push({ label: 'farms stake', skipped: 'deployer holds no HAWK-WETH LP' })
  }

  log('\n===== RESULTS =====')
  log(JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error('FATAL', e)
  console.log(JSON.stringify(results, null, 2))
  process.exit(1)
})
