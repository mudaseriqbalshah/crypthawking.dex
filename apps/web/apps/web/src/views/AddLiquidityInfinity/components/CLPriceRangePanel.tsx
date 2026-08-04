import { Protocol } from '@pancakeswap/farms'
import { useTranslation } from '@pancakeswap/localization'
import { Box, FlexGap, Text, useMatchBreakpoints } from '@pancakeswap/uikit'
import { getPriceOfCurrency } from '@pancakeswap/v3-sdk'
import { Liquidity, PricePeriodRangeChart } from '@pancakeswap/widgets-internal'
import { CLRangeSelector } from 'components/Liquidity/Form/CLRangeSelector'
import { Bound } from 'config/constants/types'
import { useInfinityPoolIdRouteParams } from 'hooks/dynamicRoute/usePoolIdRoute'
import { useCLPriceRange } from 'hooks/infinity/useCLPriceRange'
import { useCLPriceRangeCallback } from 'hooks/infinity/useCLPriceRangeCallback'
import { useCurrencyByPoolId } from 'hooks/infinity/useCurrencyByPoolId'
import { useCallback, useMemo, useState } from 'react'
import { useInverted } from 'state/infinity/shared'

import { getTokenSymbolAlias } from 'utils/getTokenAlias'
import { useCLDensityChartData } from '../hooks/useDensityChartData'
import { usePool } from '../hooks/usePool'
import { useTicksAtLimit } from '../hooks/useTicksAtLimit'
import { getAxisTicks } from '../utils'
import { useTokenRateData } from './useTokenToTokenRateData'

export const CLPriceRangePanel = () => {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const { poolId, chainId } = useInfinityPoolIdRouteParams()
  const { currency0, currency1, baseCurrency, quoteCurrency } = useCurrencyByPoolId({ poolId, chainId })
  const pool = usePool<'CL'>()
  const [inverted, setIsInverted] = useInverted()
  const [pricePeriod, setPricePeriod] = useState<Liquidity.PresetRangeItem>(Liquidity.PRESET_RANGE_ITEMS[0])
  const { lowerPrice, upperPrice } = useCLPriceRange(currency0, currency1, pool?.tickSpacing ?? undefined)

  const { isLoading: isChartDataLoading, formattedData } = useCLDensityChartData({
    baseCurrency,
    quoteCurrency,
    poolId,
    chainId,
  })

  const { data: rateData } = useTokenRateData({
    baseCurrency,
    quoteCurrency,
    chainId: currency0?.chainId,
    period: pricePeriod.value,
    protocol: Protocol.InfinityCLAMM,
    poolId,
  })

  const { price, rawPrice } = useMemo(() => {
    if (!pool || !currency0 || !pool.sqrtRatioX96)
      return {
        price: undefined,
        rawPrice: undefined,
      }

    const rawPrice_ = getPriceOfCurrency(
      {
        currency0,
        currency1,
        sqrtRatioX96: pool.sqrtRatioX96,
      },
      currency0,
    )
    return {
      price: parseFloat((inverted ? rawPrice_.invert() : rawPrice_).toFixed(8)),
      rawPrice: rawPrice_,
    }
  }, [currency0, currency1, pool, inverted])

  const { onLowerUserInput, onUpperUserInput, quickAction, handleQuickAction } = useCLPriceRangeCallback(
    baseCurrency,
    quoteCurrency,
    pool?.tickSpacing,
    rawPrice,
  )

  const onChangeBothPrice = useCallback(
    (min: string, max: string) => {
      if (inverted) {
        onUpperUserInput(min)
        onLowerUserInput(max)
      } else {
        onLowerUserInput(min)
        onUpperUserInput(max)
      }
    },
    [inverted, onLowerUserInput, onUpperUserInput],
  )
  const onChangeMinPrice = useCallback(
    (min: string) => {
      if (inverted) {
        onUpperUserInput(min)
      } else {
        onLowerUserInput(min)
      }
    },
    [inverted, onLowerUserInput, onUpperUserInput],
  )
  const onChangeMaxPrice = useCallback(
    (max: string) => {
      if (inverted) {
        onLowerUserInput(max)
      } else {
        onUpperUserInput(max)
      }
    },
    [inverted, onLowerUserInput, onUpperUserInput],
  )

  const ticksAtLimit = useTicksAtLimit(pool?.tickSpacing ?? undefined)

  const zoom = useMemo(() => {
    if (quickAction) {
      return Liquidity.getQuickActionConfigs(pool?.tickSpacing)[quickAction]
    }
    const defaultZoom = Liquidity.getZoomLevelConfigs(pool?.tickSpacing)
    if (ticksAtLimit[Bound.UPPER]) {
      return defaultZoom
    }
    const min = Number(lowerPrice?.divide(rawPrice ?? 1).toSignificant(6) ?? 1)
    const max = Number(upperPrice?.divide(rawPrice ?? 1).toSignificant(6) ?? 1)
    return {
      ...defaultZoom,
      initialMin: min * defaultZoom.initialMin,
      initialMax: max * defaultZoom.initialMax,
    }
  }, [ticksAtLimit, quickAction, pool?.tickSpacing, lowerPrice, rawPrice, upperPrice])

  const axisTicks = useMemo(() => getAxisTicks(pricePeriod.value, isMobile), [pricePeriod.value, isMobile])
  const symbol0 = useMemo(
    () => getTokenSymbolAlias(currency0?.wrapped?.address, currency0?.chainId, currency0?.symbol),
    [currency0],
  )
  const symbol1 = useMemo(
    () => getTokenSymbolAlias(currency1?.wrapped?.address, currency1?.chainId, currency1?.symbol),
    [currency1],
  )

  return (
    <>
      <FlexGap
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent={isMobile ? 'flex-start' : 'space-between'}
        gap="16px"
      >
        <Liquidity.PriceRangeDatePicker onChange={setPricePeriod} value={pricePeriod} />
        <Liquidity.RateToggle
          currencyA={inverted ? currency1 : currency0}
          handleRateToggle={() => {
            setIsInverted(!inverted)
          }}
          showReset={false}
        />
      </FlexGap>
      <FlexGap gap="2px" mt="8px" mb="-16px">
        <Text color="textSubtle" small>
          {t('Current Price')}: {price}
        </Text>
        <Text color="textSubtle" small>
          {t('%assetA% per %assetB%', {
            assetA: inverted ? symbol0 : symbol1,
            assetB: inverted ? symbol1 : symbol0,
          })}
        </Text>
      </FlexGap>
      <Box mb="8px">
        <PricePeriodRangeChart
          isLoading={isChartDataLoading}
          key={currency0?.wrapped.address}
          zoomLevel={zoom}
          baseCurrency={baseCurrency}
          quoteCurrency={quoteCurrency}
          ticksAtLimit={ticksAtLimit}
          price={price}
          priceLower={lowerPrice}
          priceUpper={upperPrice}
          onBothRangeInput={onChangeBothPrice}
          onMinPriceInput={onChangeMinPrice}
          onMaxPriceInput={onChangeMaxPrice}
          formattedData={formattedData}
          priceHistoryData={rateData}
          axisTicks={axisTicks}
          interactive
        />
      </Box>
      <Box mb="8px">
        <CLRangeSelector
          currentPrice={rawPrice}
          baseCurrency={baseCurrency}
          quoteCurrency={quoteCurrency}
          tickSpacing={pool?.tickSpacing}
          quickAction={quickAction}
          handleQuickAction={handleQuickAction}
        />
      </Box>
    </>
  )
}
