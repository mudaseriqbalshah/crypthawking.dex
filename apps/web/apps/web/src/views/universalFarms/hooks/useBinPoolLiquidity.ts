import { Protocol } from '@pancakeswap/farms'
import BN from 'bignumber.js'
import { SLOW_INTERVAL } from 'config/constants'
import useAllTicksQuery from 'hooks/useAllTicksQuery'
import { Address } from 'viem/accounts'

interface BinPoolLiquidityProps {
  chainId?: number
  poolId?: Address
}

export const useBinPoolLiquidity = ({ chainId, poolId }: BinPoolLiquidityProps) => {
  const { data: ticks } = useAllTicksQuery({
    chainId,
    poolAddress: poolId,
    protocol: Protocol.InfinityBIN,
    interval: SLOW_INTERVAL,
    enabled: Boolean(chainId && poolId),
  })
  return ticks?.reduce((acc, t) => new BN(t.liquidity).plus(acc), new BN(0))
}
