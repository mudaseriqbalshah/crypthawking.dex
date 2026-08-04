import { ChainId } from '@pancakeswap/chains'
import { baseSepoliaTokens } from '@pancakeswap/tokens'
import { FeeAmount } from '@pancakeswap/v3-sdk'
import { defineFarmV3ConfigsFromUniversalFarm } from '../defineFarmV3Configs'
import { Protocol, SerializedFarmConfig, UniversalFarmConfig, UniversalFarmConfigV3 } from '../types'

const pinnedFarmConfig: UniversalFarmConfigV3[] = [
  {
    pid: 1,
    chainId: ChainId.BASE_SEPOLIA,
    protocol: Protocol.V3,
    token0: baseSepoliaTokens.hawk,
    token1: baseSepoliaTokens.weth,
    lpAddress: '0x00bE0e0d55df569e40f46A289861307b870578c9',
    feeAmount: FeeAmount.MEDIUM,
  },
  {
    pid: 2,
    chainId: ChainId.BASE_SEPOLIA,
    protocol: Protocol.V3,
    token0: baseSepoliaTokens.weth,
    token1: baseSepoliaTokens.usdc,
    lpAddress: '0xb36477fAE0c71ea671A747e1B72Ee094F82f5A82',
    feeAmount: FeeAmount.LOW,
  },
  {
    pid: 3,
    chainId: ChainId.BASE_SEPOLIA,
    protocol: Protocol.V3,
    token0: baseSepoliaTokens.usdc,
    token1: baseSepoliaTokens.usdt,
    lpAddress: '0xa105b11344d43De4e1e97C0f55f1BA91BB7152ec',
    feeAmount: FeeAmount.LOWEST,
  },
]

export const baseSepoliaFarmConfig: UniversalFarmConfig[] = pinnedFarmConfig

export default baseSepoliaFarmConfig

/** @deprecated legacy path used by the testnet farm page */
export const legacyV3BaseSepoliaFarmConfig = defineFarmV3ConfigsFromUniversalFarm(pinnedFarmConfig)

/**
 * @deprecated legacy V2 (classic MasterChef) farm config for chain 84532.
 *
 * Consumed by `getLegacyFarmConfig` (packages/farms/src/getLegacyFarmConfig.ts), which
 * allows BASE_SEPOLIA explicitly rather than via `supportedChainIdV4` (that list also
 * drives farmsV4/Infinity + the external Merkl APR fetchers, which know nothing about
 * chain 84532 — see the comment there). pid 0 is HAWK single-staking, whose "LP address"
 * is the HAWK token itself, matching MasterChef pool 0.
 */
export const legacyFarmConfig: SerializedFarmConfig[] = [
  {
    pid: 0,
    lpSymbol: 'HAWK',
    lpAddress: baseSepoliaTokens.hawk.address,
    token: baseSepoliaTokens.hawk.serialize,
    quoteToken: baseSepoliaTokens.weth.serialize,
  },
  {
    pid: 1,
    lpSymbol: 'HAWK-WETH HAWK-LP',
    lpAddress: '0xd4eAAe265c051f338cB01F99116647A19F31e4C3',
    token: baseSepoliaTokens.hawk.serialize,
    quoteToken: baseSepoliaTokens.weth.serialize,
  },
  {
    pid: 2,
    lpSymbol: 'tUSDC-WETH HAWK-LP',
    lpAddress: '0x832E6D2DdA6D6d47459c0b09A37e2b334aBb2f8e',
    token: baseSepoliaTokens.usdc.serialize,
    quoteToken: baseSepoliaTokens.weth.serialize,
  },
  {
    // token/quoteToken order in a V2 farm config is free — it only decides which side
    // `getFarmsPrices` treats as the pricing anchor. tUSDC is the `stable` symbol in
    // `evmNativeStableLpMap[BASE_SEPOLIA]`, so putting it in `quoteToken` lets
    // getFarmQuoteTokenPrice short-circuit to the $1 peg and price tUSDT off
    // tokenPriceVsQuote. With tUSDT as the quote token instead, neither side matched
    // `stable` or `wNative` and this pair fell through to $0 with blank liquidity.
    pid: 3,
    lpSymbol: 'tUSDC-tUSDT HAWK-LP',
    lpAddress: '0x0972d080e24b67232A8A438D48C507fE6A9DB8b4',
    token: baseSepoliaTokens.usdt.serialize,
    quoteToken: baseSepoliaTokens.usdc.serialize,
  },
]
