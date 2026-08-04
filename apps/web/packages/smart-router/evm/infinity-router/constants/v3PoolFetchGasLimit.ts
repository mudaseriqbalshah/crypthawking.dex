import { ChainId } from '@pancakeswap/chains'

type V3PoolFetchConfig = {
  gasLimit: bigint
  retryGasMultiplier: number
}

const DEFAULT_FETCH_CONFIG: V3PoolFetchConfig = {
  gasLimit: 3000000n,
  retryGasMultiplier: 2,
}

const INFI_BIN_POOL_FETCH_CONFIG: V3PoolFetchConfig = {
  gasLimit: 300000n,
  retryGasMultiplier: 2,
}

const V3_POOL_FETCH_CONFIG: { [key in ChainId]?: V3PoolFetchConfig } = {}
const INFI_POOL_FETCH_CONFIG: { [key in ChainId]?: V3PoolFetchConfig } = {}

export function getV3PoolFetchConfig(chainId: ChainId) {
  return V3_POOL_FETCH_CONFIG[chainId] || DEFAULT_FETCH_CONFIG
}

export function getInfinityPoolFetchConfig(chainId: ChainId) {
  return INFI_POOL_FETCH_CONFIG[chainId] || INFI_BIN_POOL_FETCH_CONFIG
}
