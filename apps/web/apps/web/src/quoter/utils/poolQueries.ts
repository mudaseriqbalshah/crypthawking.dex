import { ChainId, isTestnetChainId } from '@pancakeswap/chains'
import { Protocol } from '@pancakeswap/farms'
import { InfinityRouter, Pool, SmartRouter, V2Pool, V3Pool } from '@pancakeswap/smart-router'
import { InfinityPoolTvlReferenceMap } from '@pancakeswap/smart-router/dist/evm/infinity-router/queries/getPoolTvl'
import { cacheByLRU } from '@pancakeswap/utils/cacheByLRU'
import { createAsyncCallWithFallbacks } from '@pancakeswap/utils/withFallback'
import { Tick } from '@pancakeswap/v3-sdk'
import { POOLS_FAST_REVALIDATE } from 'config/pools'
import { getPoolTicks } from 'hooks/useAllTicksQuery'
import memoize from 'lodash/memoize'
import { PoolQuery, PoolQueryOptions } from 'quoter/quoter.types'
import { v2Clients, v3Clients } from 'utils/graphql'
import { getViemClients } from 'utils/viem'
import { edgePoolQueryClient } from './edgePoolQueryClient'
import { Protocol as EdgeProtocol } from './edgeQueries.util'
import { PoolHashHelper } from './PoolHashHelper'

/**
 * CryptoHawking: Base Sepolia has no pool-indexing backend behind it. The upstream
 * candidate-pool API (`NEXT_PUBLIC_EXPLORE_API_ENDPOINT`) is a PancakeSwap host and is
 * intentionally blank in this fork, so `/api/pools/candidates` answers 200 with an empty
 * list — a *successful* response, which means the remote-first path never falls back and
 * the router is handed zero pools. For this chain we resolve candidate pools straight from
 * chain state (factory + on-chain multicall), which is also self-healing as new pools are
 * deployed. Scoped to 84532; every other chain keeps the remote-first path byte-identical.
 */
const isOnChainOnlyChain = (chainId: ChainId) => chainId === ChainId.BASE_SEPOLIA

/**
 * On-chain candidate resolution needs a full multicall round-trip against a public testnet
 * RPC, which regularly exceeds the 3s budget tuned for the remote pool API.
 */
const ON_CHAIN_ONLY_REQUEST_TIMEOUT = 20_000

export const poolQueriesFactory = memoize((chainId: ChainId) => {
  const POOL_TTL = POOLS_FAST_REVALIDATE[chainId] || 10_000
  function getCacheKey(args: [PoolQuery, PoolQueryOptions] | [PoolQuery]) {
    const hash = PoolHashHelper.hashPoolQuery(args[0])
    return hash
  }

  function isValid(result: Pool[]) {
    return result && result.length > 0
  }

  const cacheOption = {
    ttl: POOL_TTL,
    key: getCacheKey,
    isValid,
    maxAge: 30_000,
    requestTimeout: isOnChainOnlyChain(chainId) ? ON_CHAIN_ONLY_REQUEST_TIMEOUT : 3_000,
  }

  const getV2CandidatePools = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query

    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients
      const pools = await SmartRouter.getV2CandidatePools({
        currencyA,
        currencyB,
        v2SubgraphProvider: ({ chainId }) => (chainId ? v2Clients[chainId] : undefined),
        v3SubgraphProvider: ({ chainId }) => (chainId ? v3Clients[chainId] : undefined),
        onChainProvider: provider,
      })
      return pools as V2Pool[]
    }

    return queryFunc()
  }, cacheOption)

  const getV3CandidatePools = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const queryFunc = async () => {
      const pools = await getV3CandidatePoolsWithoutTicks(query, options)
      return fillV3Ticks(pools)
    }
    return queryFunc()
  }, cacheOption)

  const getV3CandidatePoolsWithoutTicks = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query
    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients
      return SmartRouter.getV3CandidatePools({
        currencyA,
        currencyB,
        subgraphProvider: ({ chainId }) => (chainId ? v3Clients[chainId] : undefined),
        onChainProvider: provider,
        blockNumber,
      })
    }

    return queryFunc()
  }, cacheOption)

  const getV3PoolsWithTicksOnChain = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query
    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients

      const res = await InfinityRouter.getV3CandidatePools({
        currencyA: query.currencyA,
        currencyB: query.currencyB,
        clientProvider: provider,
        gasLimit: options?.gasLimit,
      })
      return res
    }
    return queryFunc()
  }, cacheOption)

  const fillV3Ticks = async (pools: V3Pool[]) => {
    const poolTicks = await Promise.all(
      pools.map(async (pool) => {
        const data = await getPoolTicks({
          chainId: pool.token0.chainId,
          poolAddress: SmartRouter.getPoolAddress(pool),
          protocol: Protocol.V3,
        })
        return data.map(
          ({ tick, liquidityNet, liquidityGross }) => new Tick({ index: Number(tick), liquidityNet, liquidityGross }),
        )
      }),
    )
    return pools?.map((pool, i) => ({
      ...pool,
      ticks: poolTicks[i],
    }))
  }

  const fetchTvMap = cacheByLRU(
    async (protocol: EdgeProtocol[], chainId: ChainId) => {
      const api = `${process.env.NEXT_PUBLIC_EDGE_ENDPOINT || ''}/api/pools/tvlref?protocol=${protocol.join(
        ',',
      )}&chainId=${chainId}`
      const res = await fetch(api, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch tvl ref: ${await res.text()}`)
      }
      return res.json() as Promise<InfinityPoolTvlReferenceMap>
    },
    {
      ttl: 60_000,
    },
  )

  const getInfinityCandidatePoolsLight = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query
    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients
      const tvMap = await fetchTvMap(['infinityBin', 'infinityCl'], query.chainId)
      const pools = await InfinityRouter.getInfinityCandidatePoolsLite({
        currencyA,
        currencyB,
        clientProvider: provider,
        tvlRefMap: tvMap,
      })
      return pools
    }

    return queryFunc()
  }, cacheOption)

  const getInfinityCandidatePools = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query

    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients
      const pools = await InfinityRouter.getInfinityCandidatePools({
        currencyA,
        currencyB,
        clientProvider: provider,
      })

      return pools
    }
    return queryFunc()
  }, cacheOption)

  const getStableSwapPools = cacheByLRU(async (query: PoolQuery, options: PoolQueryOptions) => {
    const { currencyA, currencyB, blockNumber } = query

    const queryFunc = async () => {
      const provider = options.provider ?? getViemClients
      const resolvedPairs = await SmartRouter.getPairCombinations(currencyA, currencyB)
      const pools = await SmartRouter.getStablePoolsOnChain(resolvedPairs ?? [], provider, blockNumber)
      return pools
    }

    return queryFunc()
  }, cacheOption)

  return {
    getV2CandidatePools,
    getV3CandidatePools,
    getV3CandidatePoolsWithoutTicks,
    getV3PoolsWithTicksOnChain,
    getInfinityCandidatePoolsLight,
    getInfinityCandidatePools,
    getStableSwapPools,
  }
})

export const fetchCandidatePools = async (query: PoolQuery, options: PoolQueryOptions) => {
  const { chainId, currencyA, currencyB, blockNumber } = query

  const queries = poolQueriesFactory(chainId)
  if (!currencyA || !currencyB || !chainId || !blockNumber) {
    return []
  }
  const fallbackQuery = async () => {
    // `allSettled`, not `all`: a single protocol leg failing (an RPC hiccup, a protocol with
    // no pools deployed yet) must not throw away the pools the other legs did find.
    const poolsArray = await Promise.allSettled([
      options.stableSwap ? queries.getStableSwapPools(query, options) : ([] as Pool[]),
      options.v2Pools ? queries.getV2CandidatePools(query, options) : ([] as Pool[]),
      options.v3Pools ? queries.getV3PoolsWithTicksOnChain(query, options) : ([] as Pool[]),
      options.infinity ? queries.getInfinityCandidatePools(query, options) : ([] as Pool[]),
    ])
    return poolsArray.flatMap((r) => {
      if (r.status === 'fulfilled') {
        return r.value as Pool[]
      }
      // eslint-disable-next-line no-console
      console.warn('[quoter] candidate pool leg failed', r.reason)
      return []
    }) as Pool[]
  }

  const defaultQuery = async () => {
    const protocols = protocolsFromQuery(options)
    return edgePoolQueryClient.getAllCandidates(
      currencyA,
      currencyB,
      chainId,
      blockNumber,
      protocols,
      'full',
      options.signal,
    )
  }

  if (isTestnetChainId(chainId)) {
    return fallbackQuery()
  }
  const call = createAsyncCallWithFallbacks(defaultQuery, {
    fallbacks: [fallbackQuery],
    fallbackTimeout: 1_500, // 1.5s waiting for fetch candidate pools remote
  })

  return call()
}

export const fetchCandidatePoolsLite = async (query: PoolQuery, options: PoolQueryOptions) => {
  const { chainId, currencyA, currencyB, blockNumber } = query
  const queries = poolQueriesFactory(chainId)
  if (!currencyA || !currencyB || !chainId || !blockNumber) {
    return []
  }

  const fallbackQuery = async () => {
    const poolsArray = await Promise.all([
      options.stableSwap ? queries.getStableSwapPools(query, options) : ([] as Pool[]),
      options.v2Pools ? queries.getV2CandidatePools(query, options) : ([] as Pool[]),
      options.v3Pools ? queries.getV3CandidatePoolsWithoutTicks(query, options) : ([] as Pool[]),
      options.infinity ? queries.getInfinityCandidatePoolsLight(query, options) : ([] as Pool[]),
    ])
    return poolsArray.flat() as Pool[]
  }

  const defaultQuery = async () => {
    const protocols = protocolsFromQuery(options)
    return edgePoolQueryClient.getAllCandidates(currencyA, currencyB, chainId, blockNumber, protocols, 'light')
  }

  if (isOnChainOnlyChain(chainId)) {
    // Same on-chain sources as `fetchCandidatePools`. The *Light* infinity/v3 variants are
    // deliberately not used here: they lean on `/api/pools/tvlref`, which is backed by the
    // same absent explorer API and rejects for this chain, taking the whole `Promise.all`
    // with it. Fully on-chain pools already carry their own ticks/bins.
    // `allSettled`, not `all`: a single protocol leg failing (an RPC hiccup, a protocol with
    // no pools deployed yet) must not throw away the pools the other legs did find.
    const poolsArray = await Promise.allSettled([
      options.stableSwap ? queries.getStableSwapPools(query, options) : ([] as Pool[]),
      options.v2Pools ? queries.getV2CandidatePools(query, options) : ([] as Pool[]),
      options.v3Pools ? queries.getV3PoolsWithTicksOnChain(query, options) : ([] as Pool[]),
      options.infinity ? queries.getInfinityCandidatePools(query, options) : ([] as Pool[]),
    ])
    return poolsArray.flatMap((r) => {
      if (r.status === 'fulfilled') {
        return r.value as Pool[]
      }
      // eslint-disable-next-line no-console
      console.warn('[quoter] candidate pool leg failed', r.reason)
      return []
    }) as Pool[]
  }

  const call = createAsyncCallWithFallbacks(defaultQuery, {
    fallbacks: [fallbackQuery],
    fallbackTimeout: 3_000,
  })

  return call()
}

const protocolsFromQuery = (query: PoolQueryOptions) => {
  const protocols: string[] = []
  if (query.stableSwap) {
    protocols.push('stable')
  }
  if (query.v2Pools) {
    protocols.push('v2')
  }
  if (query.v3Pools) {
    protocols.push('v3')
  }
  if (query.infinity) {
    protocols.push('infinityCl')
    protocols.push('infinityBin')
  }
  return protocols
}
