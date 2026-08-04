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

/**
 * True when `chainId` hosts its OWN classic MasterChef, i.e. it has an entry in
 * `masterChefAddresses` above.
 *
 * This is the gate that decides whether the legacy V2 farm pipeline reads the chef on the
 * chain's own client or on BSC. It is deliberately keyed off `masterChefAddresses` rather
 * than off the chef's ABI flavour (`CLASSIC_MASTERCHEF_V1_CHAIN_IDS` in
 * `v2/fetchFarmsV2.ts`): "where does this chain's chef live" and "which ABI does that chef
 * speak" are independent questions, and a chain could perfectly well host its own
 * MasterChef*V2*. Keying off the address registry also means the gate stays correct by
 * construction — adding a chef address is what makes a chain self-hosted, so the two can
 * never drift apart.
 *
 * Chains WITHOUT an entry (ETHEREUM, ARBITRUM_ONE, GOERLI, MONAD_TESTNET, …) are upstream
 * cross-farming chains: their farm LP tokens live on their own chain but the chef that
 * tracks them lives on BSC, so they must keep resolving a BSC/BSC_TESTNET client. See
 * `getMasterChefChainId`.
 */
export const isOwnMasterChefChain = (chainId?: number): boolean =>
  Boolean(chainId && chainId in masterChefAddresses)

/**
 * Chain whose client should be used to read the classic MasterChef for `chainId`.
 *
 * Self-hosted chef chains read themselves; every other chain keeps upstream's original
 * `isTestnet ? BSC_TESTNET : BSC` resolution byte-for-byte. Note BSC and BSC_TESTNET are
 * themselves self-hosted, and for them the two branches produce the same value anyway.
 */
export const getMasterChefChainId = (chainId: number, isTestnet: boolean): number => {
  if (isOwnMasterChefChain(chainId)) return chainId
  return isTestnet ? ChainId.BSC_TESTNET : ChainId.BSC
}

/**
 * Chains whose classic chef is the ORIGINAL MasterChef (v1) rather than MasterChefV2. The
 * two ABIs are incompatible — see the comparison table in ./v2/fetchFarmsV2.ts.
 *
 * Lives here rather than next to that table so the farm-data path and the user-data path
 * (apps/web/src/state/farms/fetchFarmUser.ts) can never disagree about which flavour a
 * chain speaks. Orthogonal to `isOwnMasterChefChain`: that answers *where* the chef is,
 * this answers *what it speaks*.
 */
export const CLASSIC_MASTERCHEF_V1_CHAIN_IDS: number[] = [ChainId.BASE_SEPOLIA]

export const isClassicMasterChefV1Chain = (chainId?: number): boolean =>
  Boolean(chainId && CLASSIC_MASTERCHEF_V1_CHAIN_IDS.includes(chainId))

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
