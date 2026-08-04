import { ChainId } from '@pancakeswap/chains'

// @todo remove all other v2/v3 and type definitions
export const supportedChainIdV4 = [
  ChainId.BSC,
  ChainId.BSC_TESTNET,
  ChainId.ETHEREUM,
  ChainId.BASE,
  ChainId.OPBNB,
  ChainId.ZKSYNC,
  ChainId.POLYGON_ZKEVM,
  ChainId.LINEA,
  ChainId.ARBITRUM_ONE,
] as const

// ChainId.BASE_SEPOLIA: the legacy V2 (classic MasterChef) fetch pipeline
// (packages/farms/src/index.ts createFarmFetcher -> fetchMasterChefV2Data /
// fetchMasterChefData in packages/farms/src/v2/fetchFarmsV2.ts) used to hardcode
// `chainId = isTestnet ? ChainId.BSC_TESTNET : ChainId.BSC` and call
// `provider({ chainId })` with that hardcoded chain regardless of the actual active
// chain — this fork's wagmi client config has no BSC/BSC_TESTNET client (Base Sepolia
// only per CLAUDE.md), so that used to throw and crash the whole /farms page. Both
// functions are now chainId-aware (they use the real `chainId` param and
// `masterChefAddresses[chainId]`, falling back to the old BSC/BSC_TESTNET guess only
// for chains with no masterChefAddresses entry — BSC/BSC_TESTNET behavior is
// unchanged), so BASE_SEPOLIA is safe to include here. See RISKS.md (resolved entry).
export const supportedChainIdV2 = [
  ChainId.GOERLI,
  ChainId.BSC,
  ChainId.BSC_TESTNET,
  ChainId.ETHEREUM,
  ChainId.ARBITRUM_ONE,
  ChainId.MONAD_TESTNET,
  ChainId.BASE_SEPOLIA,
] as const
export const supportedChainIdV3 = [
  // ChainId.GOERLI,
  ChainId.BSC,
  ChainId.BSC_TESTNET,
  ChainId.ETHEREUM,
  ChainId.ZKSYNC_TESTNET,
  ChainId.POLYGON_ZKEVM_TESTNET,
  ChainId.POLYGON_ZKEVM,
  ChainId.ZKSYNC,
  ChainId.ARBITRUM_ONE,
  ChainId.LINEA,
  ChainId.BASE,
  ChainId.OPBNB,
  ChainId.OPBNB_TESTNET,
  ChainId.MONAD_TESTNET,
  ChainId.BASE_SEPOLIA,
] as const
export const supportedChainId = Array.from(new Set<ChainId>([...supportedChainIdV2, ...supportedChainIdV3]))
export const bCakeSupportedChainId = [
  ChainId.BSC,
  ChainId.ARBITRUM_ONE,
  ChainId.ETHEREUM,
  ChainId.ZKSYNC,
  ChainId.BASE,
] as const

export const FARM_AUCTION_HOSTING_IN_SECONDS = 691200

export type FarmSupportedChainId = (typeof supportedChainId)[number]

export type FarmV2SupportedChainId = (typeof supportedChainIdV2)[number]

export type FarmV3SupportedChainId = (typeof supportedChainIdV3)[number]

export type FarmV4SupportedChainId = (typeof supportedChainIdV4)[number]

export const masterChefAddresses = {
  [ChainId.BSC_TESTNET]: '0xB4A466911556e39210a6bB2FaECBB59E4eB7E43d',
  [ChainId.BSC]: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652',
  [ChainId.BASE_SEPOLIA]: '0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963',
} as const

export const masterChefV3Addresses = {
  [ChainId.ETHEREUM]: '0x556B9306565093C855AEA9AE92A594704c2Cd59e',
  // [ChainId.GOERLI]: '0x864ED564875BdDD6F421e226494a0E7c071C06f8',
  [ChainId.BSC]: '0x556B9306565093C855AEA9AE92A594704c2Cd59e',
  [ChainId.BSC_TESTNET]: '0x4c650FB471fe4e0f476fD3437C3411B1122c4e3B',
  [ChainId.ZKSYNC_TESTNET]: '0x3c6Aa61f72932aD5D7C917737367be32D5509e6f',
  [ChainId.POLYGON_ZKEVM_TESTNET]: '0xb66b07590B30d4E6E22e45Ddc83B06Bb018A7B44',
  [ChainId.POLYGON_ZKEVM]: '0xE9c7f3196Ab8C09F6616365E8873DaEb207C0391',
  [ChainId.ZKSYNC]: '0x4c615E78c5fCA1Ad31e4d66eb0D8688d84307463',
  [ChainId.ARBITRUM_ONE]: '0x5e09ACf80C0296740eC5d6F643005a4ef8DaA694',
  [ChainId.LINEA]: '0x22E2f236065B780FA33EC8C4E58b99ebc8B55c57',
  [ChainId.BASE]: '0xC6A2Db661D5a5690172d8eB0a7DEA2d3008665A3',
  [ChainId.OPBNB]: '0x05ddEDd07C51739d2aE21F6A9d97a8d69C2C3aaA',
  [ChainId.OPBNB_TESTNET]: '0x236e713bFF45adb30e25D1c29A887aBCb0Ea7E21',
  [ChainId.MONAD_TESTNET]: '0x',
  [ChainId.BASE_SEPOLIA]: '0x8DBd87Df712413b963d921a6C928cb7212Ab84F6',
} as const satisfies Record<FarmV3SupportedChainId, string>

export const crossFarmingVaultAddresses = {
  [ChainId.ETHEREUM]: '0x2e71B2688019ebdFDdE5A45e6921aaebb15b25fb',
  [ChainId.GOERLI]: '0xE6c904424417D03451fADd6E3f5b6c26BcC43841',
} as const
