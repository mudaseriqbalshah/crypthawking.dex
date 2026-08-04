import { ChainId } from '@pancakeswap/chains'
import {
  CLPoolManagerAbi,
  INFI_CL_POOL_MANAGER_ADDRESSES,
  PoolKey,
  decodeHooksRegistration,
  findHook,
  getPoolId,
  isInfinitySupported,
} from '@pancakeswap/infinity-sdk'
import { multicallByGasLimit } from '@pancakeswap/multicall'
import { Native } from '@pancakeswap/sdk'
import { BigintIsh, Currency, getCurrencyAddress, sortCurrencies } from '@pancakeswap/swap-sdk-core'
import { Address, Hex, decodeFunctionResult, encodeFunctionData } from 'viem'

import { Tick } from '@pancakeswap/v3-sdk'
import { infinityCLTickLensAbi } from '../../abis/IInfinityCLTickLens'
import { CL_HOOK_PRESETS_BY_CHAIN, CL_PRESETS_BY_CHAIN } from '../../constants'
import { INFI_CL_TICK_LENS_ADDRESSES } from '../../constants/infinity'
import { getPairCombinations } from '../../v3-router/functions'
import { createOnChainPoolFactory } from '../../v3-router/providers'
import { PoolMeta } from '../../v3-router/providers/poolProviders/internalTypes'
import { InfinityClPool, OnChainProvider, PoolType } from '../../v3-router/types'
import { getV3PoolFetchConfig } from '../constants'
import { GetInfinityCandidatePoolsParams } from '../types'

type WithMulticallGasLimit = {
  gasLimit?: BigintIsh
}

type WithClientProvider = {
  clientProvider?: OnChainProvider
}

export async function getInfinityClCandidatePools({
  currencyA,
  currencyB,
  clientProvider,
  gasLimit,
}: GetInfinityCandidatePoolsParams) {
  const pools = await getInfinityClCandidatePoolsWithoutTicks({
    currencyA,
    currencyB,
    clientProvider,
  })
  return fillClPoolsWithTicks({
    pools,
    clientProvider,
    gasLimit,
  })
}

export async function getInfinityClCandidatePoolsWithoutTicks({
  currencyA,
  currencyB,
  clientProvider,
}: Omit<GetInfinityCandidatePoolsParams, 'gasLimit'>) {
  if (!currencyA || !currencyB) {
    throw new Error(`Invalid currencyA ${currencyA} or currencyB ${currencyB}`)
  }
  const native = Native.onChain(currencyA?.chainId)
  const wnative = native.wrapped
  const pairs = await getPairCombinations(currencyA, currencyB)
  const pairsWithNative = [...pairs]
  for (const pair of pairs) {
    const index = pair.findIndex((c) => c.wrapped.equals(wnative))
    if (index >= 0) {
      const pairWithNative = [...pair]
      pairWithNative[index] = native
      pairsWithNative.push(pairWithNative as [Currency, Currency])
    }
  }
  return getInfinityClPoolsWithoutTicks(pairsWithNative, clientProvider)
}

type InfinityClPoolMeta = PoolMeta & {
  fee: number
  protocolFee?: number
  poolManager: Address
  tickSpacing: number
  hooks: Address
  hooksRegistrationBitmap?: Hex | number
}

export const getInfinityClPoolsWithoutTicks = createOnChainPoolFactory<InfinityClPool, InfinityClPoolMeta>({
  abi: CLPoolManagerAbi,
  getPossiblePoolMetas: async ([currencyA, currencyB]) => {
    const { chainId } = currencyA
    if (!isInfinitySupported(chainId))
      throw new Error(`Failed to get cl pools. Infinity not supported on chain ${chainId}`)
    const [currency0, currency1] = sortCurrencies([currencyA, currencyB])
    const poolIdList = new Set<string>()
    const metas: InfinityClPoolMeta[] = []
    const presets = CL_PRESETS_BY_CHAIN[chainId]
    const hookPresets = CL_HOOK_PRESETS_BY_CHAIN[chainId]
    for (const { fee, tickSpacing } of presets) {
      for (const { address: hooks, registrationBitmap, poolKeyOverride } of hookPresets) {
        const poolKey: PoolKey<'CL'> = {
          currency0: getCurrencyAddress(currency0),
          currency1: getCurrencyAddress(currency1),
          fee,
          parameters: {
            tickSpacing,
            hooksRegistration:
              registrationBitmap !== undefined ? decodeHooksRegistration(registrationBitmap) : undefined,
          },
          poolManager: INFI_CL_POOL_MANAGER_ADDRESSES[chainId],
          hooks,
          ...(poolKeyOverride ?? {}),
        }
        const id = getPoolId(poolKey)
        if (poolIdList.has(id)) {
          continue
        }

        poolIdList.add(id)
        metas.push({
          currencyA,
          currencyB,
          fee,
          tickSpacing,
          hooks,
          poolManager: poolKey.poolManager,
          id,
          hooksRegistrationBitmap: registrationBitmap,
          ...poolKeyOverride,
        })
      }
    }
    return metas
  },
  buildPoolInfoCalls: ({ id, poolManager: address }) => [
    {
      address,
      functionName: 'getLiquidity',
      args: [id],
    },
    {
      address,
      functionName: 'getSlot0',
      args: [id],
    },
  ],
  buildPool: (
    { currencyA, currencyB, id, tickSpacing, poolManager, hooks, hooksRegistrationBitmap },
    [liquidity, slot0],
  ) => {
    if (!slot0 || !slot0[0]) {
      return null
    }
    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0
    const [currency0, currency1] = sortCurrencies([currencyA, currencyB])
    const whitelistHook = findHook(hooks, currencyA.wrapped.chainId)
    return {
      id,
      type: PoolType.InfinityCL,
      currency0,
      currency1,
      fee: whitelistHook?.defaultFee ?? lpFee,
      protocolFee,
      liquidity: BigInt(liquidity.toString()),
      sqrtRatioX96: BigInt(sqrtPriceX96.toString()),
      tick: Number(tick),
      tickSpacing,
      poolManager,
      hooks,
      hooksRegistrationBitmap,
    }
  },
})

function getBitmapIndex(tick: number, tickSpacing: number) {
  return Math.floor(tick / tickSpacing / 256)
}

type GetBitmapIndexListParams = {
  currentTick: number
  tickSpacing: number
}

function createBitmapIndexListBuilder(tickRange: number) {
  return function buildBitmapIndexList<T>({ currentTick, tickSpacing, ...rest }: GetBitmapIndexListParams & T) {
    const minIndex = getBitmapIndex(currentTick - tickRange, tickSpacing)
    const maxIndex = getBitmapIndex(currentTick + tickRange, tickSpacing)
    return Array.from(Array(maxIndex - minIndex + 1), (_, i) => ({
      bitmapIndex: minIndex + i,
      ...rest,
    }))
  }
}

// only allow 10% slippage
const buildBitmapIndexList = createBitmapIndexListBuilder(10)

type FillPoolsWithTicksParams = {
  pools: InfinityClPool[]
} & WithClientProvider &
  WithMulticallGasLimit

export async function fillClPoolsWithTicks({
  pools,
  clientProvider,
  gasLimit,
}: FillPoolsWithTicksParams): Promise<InfinityClPool[]> {
  if (pools.length === 0) {
    return []
  }
  const chainId: ChainId = pools[0]?.currency0.chainId
  const tickLensAddress = INFI_CL_TICK_LENS_ADDRESSES[chainId]
  const client = clientProvider?.({ chainId })
  if (!client || !tickLensAddress) {
    throw new Error('Fill pools with ticks failed. No valid public client or tick lens found.')
  }
  const { gasLimit: gasLimitPerCall, retryGasMultiplier } = getV3PoolFetchConfig(chainId)
  const bitmapIndexes = pools
    .map(({ tick, tickSpacing }, i) =>
      buildBitmapIndexList<{ poolIndex: number }>({ currentTick: tick, tickSpacing, poolIndex: i }),
    )
    .reduce<{ bitmapIndex: number; poolIndex: number }[]>((acc, cur) => {
      acc.push(...cur)
      return acc
    }, [])
  const res = await multicallByGasLimit(
    bitmapIndexes.map(({ poolIndex, bitmapIndex }) => ({
      target: tickLensAddress as Address,
      callData: encodeFunctionData({
        abi: infinityCLTickLensAbi,
        args: [pools[poolIndex].id, bitmapIndex],
        functionName: 'getPopulatedTicksInWord',
      }),
      gasLimit: gasLimitPerCall,
    })),
    {
      chainId,
      client,
      gasLimit,
      retryFailedCallsWithGreaterLimit: {
        gasLimitMultiplier: retryGasMultiplier,
      },
    },
  )
  const poolsWithTicks = pools.map((p) => ({ ...p }))
  for (const [index, result] of res.results.entries()) {
    const { poolIndex } = bitmapIndexes[index]
    const pool = poolsWithTicks[poolIndex]
    const data = result.success
      ? (decodeFunctionResult({
          abi: infinityCLTickLensAbi,
          functionName: 'getPopulatedTicksInWord',
          data: result.result as `0x${string}`,
        }) as { tick: number; liquidityNet: bigint; liquidityGross: bigint }[])
      : undefined
    const newTicks = data
      ?.map(
        ({ tick, liquidityNet, liquidityGross }: { tick: number; liquidityNet: bigint; liquidityGross: bigint }) =>
          new Tick({
            index: tick,
            liquidityNet,
            liquidityGross,
          }),
      )
      .reverse()
    if (!newTicks) {
      continue
    }
    pool.ticks = [...(pool.ticks || []), ...newTicks]
  }
  // Filter those pools with no ticks found
  return poolsWithTicks.filter((p) => p.ticks?.length)
}
