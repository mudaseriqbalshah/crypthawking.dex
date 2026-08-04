import { ChainId, chainNames } from '@pancakeswap/chains'
import { Protocol } from '@pancakeswap/farms'
import { $path } from 'next-typesafe-url'
import { Address, Hex } from 'viem'

export const LIQUIDITY_PAGES = {
  infinity: {
    CREATE_POOL: '/liquidity/create',
    ADD_LIQUIDITY_SELECT: '/liquidity/select',
    ADD_LIQUIDITY: '/liquidity/add',
    POSITION_DETAIL: '/liquidity/position',
  },
  POSITIONS: '/liquidity/positions',
}

export const DISABLED_ADD_LIQUIDITY_CHAINS: {
  [chainId in ChainId]?: {
    sunsetDate: number
  }
} = {
  [ChainId.POLYGON_ZKEVM]: {
    sunsetDate: 1759183200,
  },
}

export const getCreateInfinityPoolPageURL = ({
  chainId,
  token0,
  token1,
}: {
  chainId?: number
  token0?: Address
  token1?: Address
}) => {
  if (!chainId) {
    return LIQUIDITY_PAGES.infinity.CREATE_POOL
  }
  if (!token0 || !token1) {
    return `${LIQUIDITY_PAGES.infinity.CREATE_POOL}/${chainId}/infinity`
  }
  return `${LIQUIDITY_PAGES.infinity.CREATE_POOL}/${chainId}/infinity/${token0}/${token1}`
}

export const getAddInfinityLiquidityURL = ({
  chainId,
  chainName,
  poolId,
}: {
  chainId?: number
  chainName?: string
  poolId?: Address
}) => {
  if (!(chainId || chainName) || !poolId) {
    return LIQUIDITY_PAGES.infinity.ADD_LIQUIDITY_SELECT
  }
  return `${LIQUIDITY_PAGES.infinity.ADD_LIQUIDITY}/${chainId ? chainNames[chainId] : chainName}/infinity/${poolId}`
}

export const getLiquidityDetailURL = ({
  chainId,
  tokenId,
  poolId,
  protocol,
}: {
  chainId?: number
  tokenId?: number | Address
  poolId?: Hex
  protocol?: Protocol
}) => {
  if (!(chainId && protocol)) {
    return undefined
  }

  if (protocol === Protocol.InfinityBIN && poolId) {
    return $path({
      route: '/liquidity/position/[[...positionId]]',
      routeParams: {
        positionId: [Protocol.InfinityBIN, poolId],
      },
    })
  }

  if (protocol === Protocol.InfinityCLAMM && tokenId) {
    return $path({
      route: '/liquidity/position/[[...positionId]]',
      routeParams: {
        positionId: [Protocol.InfinityCLAMM, tokenId as number],
      },
    })
  }
  return undefined
}

export const getSelectInfinityLiquidityURL = ({
  chainId,
  protocol,
  currency0,
  currency1,
}: {
  chainId?: number
  protocol?: 'infinity' | 'v3' | 'v2' | 'stableSwap'
  currency0?: string
  currency1?: string
}) => {
  if (!chainId || !protocol || !currency0 || !currency1) {
    return LIQUIDITY_PAGES.infinity.ADD_LIQUIDITY_SELECT
  }
  return $path({
    route: '/liquidity/select/pools/[[...selectId]]',
    routeParams: {
      selectId: [chainId, protocol, currency0, currency1],
    },
  })
}
