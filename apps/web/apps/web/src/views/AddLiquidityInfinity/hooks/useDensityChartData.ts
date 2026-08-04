import { Currency, isCurrencySorted } from '@pancakeswap/swap-sdk-core'
import { BinTickProcessed, useBinPoolActiveLiquidity, usePoolActiveLiquidity } from 'hooks/infinity/usePoolTickData'
import { tryParsePrice } from 'hooks/v3/utils'
import { useMemo } from 'react'
import { Address } from 'viem/accounts'

function parsePrice(baseCurrency?: Currency, quoteCurrency?: Currency, priceValue?: string) {
  const isSorted = baseCurrency && quoteCurrency && isCurrencySorted(baseCurrency, quoteCurrency)
  const basePrice = tryParsePrice(baseCurrency, quoteCurrency, priceValue)
  const price = isSorted ? basePrice : basePrice?.invert()
  return price && price?.denominator !== 0n ? parseFloat(price.toFixed(18)) : 0
}

interface DensityChartProps {
  poolId?: Address
  chainId?: number
  baseCurrency?: Currency
  quoteCurrency?: Currency
}

export function useCLDensityChartData({ poolId, chainId, baseCurrency, quoteCurrency }: DensityChartProps) {
  const { isLoading, error, data } = usePoolActiveLiquidity(poolId, chainId)

  const formattedData = useMemo(() => {
    if (!data?.length) {
      return undefined
    }

    return data
      .map(({ liquidityActive, price0 }) => ({
        activeLiquidity: parseFloat(liquidityActive.toString()),
        price0: parsePrice(baseCurrency, quoteCurrency, price0),
      }))
      .filter(({ activeLiquidity }) => activeLiquidity > 0)
  }, [data, baseCurrency, quoteCurrency])

  return useMemo(() => {
    return {
      isLoading,
      error,
      formattedData: !isLoading ? formattedData : undefined,
    }
  }, [isLoading, error, formattedData])
}

export type BinTickDataItem = Omit<BinTickProcessed, 'price0' | 'price1' | 'activeLiquidity'> & {
  price0: number
  price1: number
  activeLiquidity: number
}

export function useBinDensityChartData({ poolId, chainId, baseCurrency, quoteCurrency }: DensityChartProps) {
  const { isLoading, error, data, activeBinId } = useBinPoolActiveLiquidity(poolId, chainId)

  const formattedData: BinTickDataItem[] | undefined = useMemo(() => {
    if (!data?.length) {
      return undefined
    }

    return data
      .map((t) => ({
        ...t,
        activeLiquidity: parseFloat(t.liquidityActive.toString()),
        price0: parsePrice(baseCurrency, quoteCurrency, t.price0),
        price1: parsePrice(baseCurrency, quoteCurrency, t.price1),
      }))
      .filter(({ activeLiquidity }) => activeLiquidity > 0)
  }, [data, baseCurrency, quoteCurrency])

  return useMemo(() => {
    return {
      isLoading,
      error,
      formattedData: !isLoading ? formattedData : undefined,
      activeBinId,
    }
  }, [activeBinId, isLoading, error, formattedData])
}
