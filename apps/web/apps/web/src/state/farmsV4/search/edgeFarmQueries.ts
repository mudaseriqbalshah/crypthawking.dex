import { ChainId, chainNamesInKebabCase } from '@pancakeswap/chains'
import {
  FarmV4SupportedChainId,
  fetchAllUniversalFarms,
  Protocol,
  supportedChainIdV4,
  UniversalFarmConfig,
} from '@pancakeswap/farms'
import { getCurrencyAddress, Pair } from '@pancakeswap/sdk'
import { InfinityRouter, SmartRouter } from '@pancakeswap/smart-router'

import { SORT_ORDER } from '@pancakeswap/uikit'
import uniqBy from '@pancakeswap/utils/uniqBy'
import { computePoolAddress, DEPLOYER_ADDRESSES } from '@pancakeswap/v3-sdk'
import { edgeQueries } from 'quoter/utils/edgePoolQueries'
import { APIChain, getEdgeChainName } from 'quoter/utils/edgeQueries.util'
import { PoolInfo } from 'state/farmsV4/state/type'
import { explorerApiClient } from 'state/info/api/client'
import { Address } from 'viem/accounts'
import { normalizeAddress, safeGetAddress, SerializedFarmInfo } from './farm.util'

const DEFAULT_PROTOCOLS: Protocol[] = Object.values(Protocol)
export interface FarmQuery {
  keywords: string
  chains: ChainId[]
  protocols: Protocol[]
  sortBy: keyof PoolInfo | null
  sortOrder: SORT_ORDER
  activeChainId?: ChainId
}

function getPoolId(farm: UniversalFarmConfig) {
  if (farm.protocol === 'v3') {
    const deployerAddress = DEPLOYER_ADDRESSES[farm.chainId]
    const id = computePoolAddress({
      deployerAddress: deployerAddress as Address,
      tokenA: farm.token0.wrapped,
      tokenB: farm.token1.wrapped,
      fee: farm.feeAmount,
    })
    return id
  }
  if (farm.protocol === 'v2') {
    const id = Pair.getAddress(farm.token0.wrapped, farm.token1.wrapped)
    return id
  }
  if (farm.protocol === 'stable') {
    return farm.stableSwapAddress
  }
  if (farm.protocol === 'infinityCl' || farm.protocol === 'infinityBin') {
    return farm.poolId
  }
  throw new Error(`Unsupported protocol: ${farm.protocol}`)
}

export type ChainNameKebab = (typeof chainNamesInKebabCase)[keyof typeof chainNamesInKebabCase]

async function fetchExplorerFarmPools(protocols: Protocol[], chainIds: FarmV4SupportedChainId[]) {
  const chains = chainIds.map((chainId) => getEdgeChainName(chainId))
  const resp = await explorerApiClient.GET('/cached/pools/farming', {
    params: {
      query: {
        protocols: protocols ?? DEFAULT_PROTOCOLS,
        chains,
      },
    },
    headers: {
      EXPLORER_API_KEY: process.env.EXPLORER_API_KEY,
    },
  })

  return (resp.data || []) as InfinityRouter.RemotePoolBase[]
}

function toRemotePool(farm: UniversalFarmConfig) {
  const { token0, token1 } = farm
  const poolBase: InfinityRouter.RemotePoolBase = {
    id: getPoolId(farm),
    chainId: farm.chainId,
    tvlUSD: '0',
    apr24h: '0',
    volumeUSD24h: '0',
    protocol: farm.protocol,
    token0: {
      id: getCurrencyAddress(token0),
      decimals: farm.token0.decimals,
      symbol: farm.token0.symbol,
    },
    token1: {
      id: getCurrencyAddress(token1),
      decimals: farm.token1.decimals,
      symbol: farm.token1.symbol,
    },
    // @ts-ignore
    feeTier: farm.feeAmount,
  }
  if (farm.protocol === 'v2') {
    return poolBase as InfinityRouter.RemotePoolV2
  }
  if (farm.protocol === 'v3') {
    return {
      ...poolBase,
      feeTier: farm.feeAmount,
    } as InfinityRouter.RemotePoolV3
  }

  return poolBase
}

async function fetchFarms(query: {
  extend: boolean
  protocols: Protocol[]
  chains: FarmV4SupportedChainId[]
  address?: string
}) {
  // const protocols = DEFAULT_PROTOCOLS
  const { extend, protocols: _protocols, address, chains } = query
  const protocols = _protocols.length > 0 ? _protocols : DEFAULT_PROTOCOLS
  const chainIds = chains.length > 0 ? chains : supportedChainIdV4
  if (!extend) {
    const farmPools = await fetchExplorerFarmPools(protocols, Array.from(chainIds))
    const explorerPools = await fetchAllExplorerPools(protocols, Array.from(chainIds))
    return [...farmPools, ...explorerPools]
  }
  if (address) {
    return fetchAllExplorerPoolsByAddress(Array.from(chainIds), address)
  }
  return fetchAllExplorerPools(protocols, Array.from(chainIds))
}

async function queryFarms(query: {
  extend: boolean
  protocols: Protocol[]
  chains: FarmV4SupportedChainId[]
  address?: string
}) {
  try {
    const { extend } = query
    const [pools, universalFarms] = await Promise.all([fetchFarms(query), fetchAllUniversalFarms()])

    const farmMaps = universalFarms.reduce((acc, farm) => {
      const id = getPoolId(farm)
      return {
        ...acc,
        [`${farm.chainId}:${id}`]: {
          pid: farm.pid,
          lpAddress: safeGetAddress(farm.lpAddress),
        },
      }
    }, {} as Record<Address, number | undefined>)
    const universalFarmPools = universalFarms.map((x) => toRemotePool(x))

    const all = (extend ? [...pools] : [...pools, ...universalFarmPools])
      .map(normalizeAddress)
      .filter((x) => x) as InfinityRouter.RemotePoolBase[]

    const allPools = uniqBy(all, (p) => `${p.chainId}:${p.id}`)
      .map((pool) => {
        const remotePool = InfinityRouter.parseRemotePool(pool as InfinityRouter.RemotePool)
        if (!remotePool) {
          return null
        }
        // @ts-ignore
        if (typeof remotePool.tvlUSD !== 'undefined') {
          // @ts-ignore
          remotePool.tvlUSD = remotePool.tvlUSD.toString()
        }

        const farmInfo = farmMaps[`${pool.chainId}:${pool.id}`]
        const pid = farmInfo ? farmInfo.pid : undefined
        const lpAddress = farmInfo ? farmInfo.lpAddress : undefined
        return {
          pool: SmartRouter.Transformer.serializePool(remotePool),
          id: pool.id,
          chainId: pool.chainId,
          protocol: pool.protocol,
          tvlUSD: pool.tvlUSD || '0',
          vol24hUsd: pool.volumeUSD24h || '0',
          pid,
          apr24h: Number(pool.apr24h || 0),
          isDynamicFee: pool.isDynamicFee,
          feeTier: pool.feeTier,
          lpAddress: lpAddress || pool.id,
        } as SerializedFarmInfo
      })
      .filter((x) => x) as SerializedFarmInfo[]
    return allPools
  } catch (ex) {
    console.warn('Error fetching farms:', ex)
    return []
  }
}

async function fetchAllExplorerPools(protocols: Protocol[], chains: FarmV4SupportedChainId[]) {
  const queries = protocols.map((protocol) => ({
    baseUrl: `${process.env.NEXT_PUBLIC_EXPLORE_API_ENDPOINT}/cached/pools/list`,
    protocols: [protocol],
    chains: chains.map((chain) => getEdgeChainName(chain)),
    maxPages: 1, // Max check 3 pages for random extending
    orderBy: 'volumeUSD24h' as const,
  }))
  const poolQueries = queries.map((query) => edgeQueries.fetchAllPools(query))
  const pools = await Promise.allSettled(poolQueries)
  const poolResults = pools
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => (result as PromiseFulfilledResult<InfinityRouter.RemotePoolBase[]>).value)
    .map(normalizeAddress)
    .filter((x) => x) as InfinityRouter.RemotePoolBase[]

  return uniqBy(poolResults, (p) => `${p.chainId}:${p.id}`)
}

async function fetchAllExplorerPoolsByAddress(chains: FarmV4SupportedChainId[], address: string) {
  const baseUrl = `${process.env.NEXT_PUBLIC_EXPLORE_API_ENDPOINT}/cached/pools/list`
  const protocolsSet = [
    ['v2', 'v3', 'stable'],
    ['infinityBin', 'infinityCl'],
  ]
  const queries = protocolsSet
    .map((protocols) => {
      return chains.map((chain) => {
        const chainName = getEdgeChainName(chain)
        return [protocols, chain, chainName] as [Protocol[], ChainId, APIChain]
      })
    })
    .flat()

  const poolQueries = queries.map(([protocols, chain, chainName]) => {
    const poolAddress = `${chain}:${address}`
    return edgeQueries.fetchAllPools({ baseUrl, protocols, chains: [chainName], pools: [poolAddress], maxPages: 1 })
  })
  const tokensQuery = queries.map(([protocols, chain, chainName]) => {
    const tokenAddress = `${chain}:${address}`
    return edgeQueries.fetchAllPools({ baseUrl, protocols, chains: [chainName], tokens: [tokenAddress], maxPages: 1 })
  })
  const pools = await Promise.allSettled([...poolQueries, ...tokensQuery])
  const poolResults = pools
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => (result as PromiseFulfilledResult<InfinityRouter.RemotePoolBase[]>).value)
    .map(normalizeAddress)
    .filter((x) => x) as InfinityRouter.RemotePoolBase[]

  return [...poolResults]
}

export default {
  queryFarms,
}
