import { ChainId } from '@pancakeswap/chains'
import { supportedChainIdV4 } from '@pancakeswap/farms'
import {
  BinPoolManagerAbi,
  CLPoolManagerAbi,
  decodePoolKey,
  DYNAMIC_FEE_FLAG,
  findHook,
  PoolType as IPoolType,
  PoolKey,
  Slot0,
} from '@pancakeswap/infinity-sdk'
import { zeroAddress } from '@pancakeswap/price-api-sdk'
import { InfinityBinPool, InfinityClPool, InfinityRouter, Pool, PoolType, SmartRouter } from '@pancakeswap/smart-router'
import { Currency } from '@pancakeswap/swap-sdk-core'
import { InfinityFeeTierPoolParams } from 'hooks/infinity/useInfinityFeeTier'
import qs from 'qs'
import { ALLOWED_PROTOCOLS } from 'quoter/utils/edgeQueries.util'
import { CakeAprValue } from 'state/farmsV4/atom'
import { AprInfo } from 'state/farmsV4/hooks'
import { BasePoolInfo, PoolInfo } from 'state/farmsV4/state/type'
import { checksumAddress } from 'utils/checksumAddress'
import type { ContractFunctionReturnType } from 'viem'
import type { Address } from 'viem/accounts'
import type { Prettify } from 'viem/chains'

enum Protocol {
  V2 = 'v2',
  V3 = 'v3',
  STABLE = 'stable',
  InfinityBIN = 'infinityBin',
  InfinityCLAMM = 'infinityCl',
}

export type FarmInfo = FarmProps & {
  pool: Pool
} & {
  cakeApr: CakeAprValue
}

type CakeAprItem = {
  value: `${number}`
  // boost apr
  boost?: `${number}`
  poolWeight?: string
  cakePerYear?: string
  userTvlUsd?: string
  totalSupply?: string
}

export type FarmProps = {
  id: Address
  chainId: ChainId
  lpApr?: `${number}`
  lpAddress?: `0x${string}`
  merklApr?: `${number}`
  // cakeApr: CakeAprValue
  feeTier: number
  apr24h: number
  vol24hUsd: `${number}`
  tvlUSD: `${number}`
  protocol: Protocol
  feeTierBase: number
  pid?: number
  isDynamicFee?: boolean
}

export type SerializedFarmInfo = FarmProps & {
  pool: SmartRouter.Transformer.SerializedPool
} & {
  cakeApr: CakeAprItem
}

export const getFarmTokens = (farm: FarmInfo): Currency[] => {
  const { pool } = farm
  const currencies = SmartRouter.getCurrenciesOfPool(pool)
  return currencies
}

export const getSerializedFarmTokens = (farm: SerializedFarmInfo) => {
  const { pool: spool } = farm
  const pool = SmartRouter.Transformer.parsePool(farm.chainId, spool)
  return SmartRouter.getCurrenciesOfPool(pool)
}

export const isDynamic = (pool?: InfinityClPool | InfinityBinPool) => {
  if (!pool) return false
  return pool.fee === DYNAMIC_FEE_FLAG
}

export const farmPropsToPoolInfoBase = (farm: FarmProps, token0: Currency, token1: Currency): BasePoolInfo => {
  const base: BasePoolInfo = {
    chainId: farm.chainId,
    lpAddress: farm.lpAddress || '0x',
    protocol: farm.protocol,
    token0,
    token1: token1.asToken,
    lpApr: `${farm.lpApr || ''}` as `${number}`,
    tvlUsd: farm.tvlUSD || '0',
    vol24hUsd: `${farm.vol24hUsd || ''}` as `${number}`,
    feeTier: farm.feeTier,
    feeTierBase: farm.feeTierBase,
    isFarming: false,
    isActiveFarm: false,
    pid: farm.pid,
    farm: farm as FarmInfo,
  }
  return base
}

export const farmToPoolInfo = (farm: FarmInfo): PoolInfo => {
  const [token0, token1] = getFarmTokens(farm)
  const base = farmPropsToPoolInfoBase(farm, token0, token1)
  if (farm.protocol === Protocol.InfinityCLAMM || farm.protocol === Protocol.InfinityBIN) {
    const infinityPool = farm.pool as InfinityClPool | InfinityBinPool
    return {
      ...base,
      poolId: farm.id,
      hookAddress: infinityPool.hooks,
      dynamic: isDynamic(infinityPool),
    } as PoolInfo
  }

  return base as PoolInfo
}

export const getPoolInfoForInfiFee = (farm: FarmInfo) => {
  const pool = farm.pool as InfinityClPool | InfinityBinPool

  const hookData = pool.hooks ? findHook(pool.hooks, farm.chainId) : undefined
  const isDynamic = pool.fee === DYNAMIC_FEE_FLAG
  return {
    protocolFee: pool.protocolFee!,
    fee: pool.fee,
    poolType: pool.type === PoolType.InfinityCL ? 'CL' : 'Bin',
    dynamic: isDynamic,
    hookData,
  } as InfinityFeeTierPoolParams
}

export const getFarmHookData = (farm?: FarmInfo) => {
  if (!farm) {
    return undefined
  }
  const pool = farm.pool as InfinityClPool | InfinityBinPool
  const hookData = pool.hooks ? findHook(pool.hooks, farm.chainId) : undefined
  return hookData
}

export const getFarmAprInfo = (farm?: FarmInfo) => {
  if (!farm) {
    return undefined
  }

  const aprInfo: AprInfo = {
    lpApr: farm.lpApr || '0',
    cakeApr: farm.cakeApr,
    merklApr: farm.merklApr || '0',
  }
  return aprInfo
}

export const safeGetAddress = (address: Address) => {
  try {
    return checksumAddress(address)
  } catch (error) {
    return undefined
  }
}

export const getFarmKey = (farm: Pick<FarmProps, 'chainId' | 'id'>) => {
  return `${farm.chainId}:${farm.id}`.toLowerCase()
}

export const normalizeAddress = (pool: InfinityRouter.RemotePoolBase) => {
  if (pool.id) {
    const id = safeGetAddress(pool.id)
    if (id) {
      // eslint-disable-next-line no-param-reassign
      pool.id = id
    }
  }
  return pool
}

export const parsePoolKeyResult = <
  TPoolType extends IPoolType,
  TResult extends TPoolType extends 'CL'
    ? Prettify<ContractFunctionReturnType<typeof CLPoolManagerAbi, 'view', 'poolIdToPoolKey'>>
    : Prettify<ContractFunctionReturnType<typeof BinPoolManagerAbi, 'view', 'poolIdToPoolKey'>>,
>(
  poolType: TPoolType,
  result: TResult,
): PoolKey<TPoolType> => {
  const [currency0, currency1, hooks, poolManager, fee, parameters] = result

  return decodePoolKey(
    {
      currency0,
      currency1,
      hooks,
      poolManager,
      fee,
      parameters,
    },
    poolType,
  )
}

export const parseSlot0 = <
  TPoolType extends IPoolType,
  TSlot0 extends TPoolType extends 'CL'
    ? ContractFunctionReturnType<typeof CLPoolManagerAbi, 'view', 'getSlot0'>
    : ContractFunctionReturnType<typeof BinPoolManagerAbi, 'view', 'getSlot0'>,
>(
  poolType: TPoolType,
  slot0: TSlot0,
): Slot0<TPoolType> => {
  if (poolType === 'CL') {
    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0 as ContractFunctionReturnType<
      typeof CLPoolManagerAbi,
      'view',
      'getSlot0'
    >
    return {
      sqrtPriceX96,
      tick,
      protocolFee,
      lpFee,
    } as Slot0<TPoolType>
  }

  const [activeId, protocolFee, lpFee] = slot0 as ContractFunctionReturnType<
    typeof BinPoolManagerAbi,
    'view',
    'getSlot0'
  >
  return {
    activeId,
    protocolFee,
    lpFee,
    dynamic: lpFee === DYNAMIC_FEE_FLAG,
  } as Slot0<TPoolType>
}

export const isValidPoolKeyResult = (
  result?: ContractFunctionReturnType<typeof CLPoolManagerAbi, 'view', 'poolIdToPoolKey'>,
) => result && result.length === 6 && result[3] !== zeroAddress

export function parseFarmSearchQuery(raw: string) {
  const queryParsed = qs.parse(raw)
  let address = queryParsed.address as string | undefined
  if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    address = undefined
  }
  const protocols = ((queryParsed.protocols as string) || '').split(',').filter((x) => x) as Protocol[]
  for (const protocol of protocols) {
    if (ALLOWED_PROTOCOLS.indexOf(protocol) === -1) {
      throw new Error('Invalid protocol')
    }
  }

  const chains = ((queryParsed.chains as string) || '')
    .split(',')
    .filter((x) => x)
    .map((c) => Number(c))
    .filter((c) => !Number.isNaN(c)) as ChainId[]

  for (const chainId of chains) {
    if (!supportedChainIdV4.includes(chainId as any)) {
      throw new Error('Invalid chainId')
    }
  }

  return {
    extend: Boolean(queryParsed.extend),
    protocols,
    address,
    chains,
  }
}
