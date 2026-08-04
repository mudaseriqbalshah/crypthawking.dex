import { Protocol } from '@pancakeswap/farms'
import { LegacyRouter } from '@pancakeswap/smart-router/legacy-router'
import { CHAIN_QUERY_NAME } from 'config/chains'
import { PERSIST_CHAIN_KEY } from 'config/constants'
import { getAddInfinityLiquidityURL } from 'config/constants/liquidity'
import type { InfinityPoolInfo, PoolInfo } from 'state/farmsV4/state/type'
import { multiChainPaths } from 'state/info/constant'
import type { Address } from 'viem'
import { getCurrencyAddress } from '@pancakeswap/swap-sdk-core'
import { addQueryToPath } from './addQueryToPath'
import { isAddressEqual } from './safeGetAddress'

export function getPoolAddLiquidityLink(pool: PoolInfo): string {
  const { chainId, protocol, lpAddress, feeTier } = pool
  const token0Address = pool.token0 ? (getCurrencyAddress(pool.token0) as Address) : undefined
  const token1Address = pool.token1 ? (getCurrencyAddress(pool.token1) as Address) : undefined
  const tokenPath = token0Address && token1Address ? `${token0Address}/${token1Address}` : ''
  const poolId = (pool as Partial<InfinityPoolInfo>).poolId

  if ([Protocol.InfinityBIN, Protocol.InfinityCLAMM].includes(protocol)) {
    const href = getAddInfinityLiquidityURL({ chainId, poolId: poolId || lpAddress })
    return addQueryToPath(href, { chain: CHAIN_QUERY_NAME[chainId], [PERSIST_CHAIN_KEY]: '1' })
  }

  if (protocol === Protocol.V2) {
    return addQueryToPath(`/v2/add/${tokenPath}`, { chain: CHAIN_QUERY_NAME[chainId], [PERSIST_CHAIN_KEY]: '1' })
  }
  if (protocol === Protocol.STABLE) {
    return addQueryToPath(`/stable/add/${tokenPath}`, { chain: CHAIN_QUERY_NAME[chainId], [PERSIST_CHAIN_KEY]: '1' })
  }

  return addQueryToPath(`/add/${tokenPath}/${feeTier}`, { chain: CHAIN_QUERY_NAME[chainId], [PERSIST_CHAIN_KEY]: '1' })
}

export async function getLinkForPool(pool: PoolInfo, type: 'detail' | 'info'): Promise<string> {
  const { chainId, protocol, lpAddress, stableSwapAddress, feeTier } = pool
  const poolId = (pool as Partial<InfinityPoolInfo>).poolId

  if (type === 'detail') {
    const linkPrefix = `/liquidity/pool${multiChainPaths[chainId] || '/bsc'}`
    if (protocol === Protocol.STABLE) {
      if (stableSwapAddress) {
        return `${linkPrefix}/${stableSwapAddress}`
      }
      const pairs = await LegacyRouter.getStableSwapPairs(chainId)
      const ssPair = pairs?.find((pair) => isAddressEqual(pair.lpAddress, lpAddress))
      if (ssPair) {
        return `${linkPrefix}/${ssPair.stableSwapAddress}`
      }
    }
    return `${linkPrefix}/${lpAddress}`
  }

  // info page
  const toLink = (addr: Address, p: string, q: string = '') =>
    `/info/${p}${multiChainPaths[chainId]}/pairs/${addr}?${q}`
  if (protocol === Protocol.STABLE) {
    const pairs = await LegacyRouter.getStableSwapPairs(chainId)
    const ssPair = pairs?.find((pair) => isAddressEqual(pair.lpAddress, lpAddress))
    if (ssPair) {
      return toLink(ssPair.stableSwapAddress, '', 'type=stableSwap')
    }
  }
  return toLink(lpAddress, protocol)
}

export const getPoolDetailPageLink = (pool: PoolInfo) => getLinkForPool(pool, 'detail')
export const getPoolInfoPageLink = (pool: PoolInfo) => getLinkForPool(pool, 'info')
