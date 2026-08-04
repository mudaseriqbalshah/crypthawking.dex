import { useIsMounted, usePreviousValue } from '@pancakeswap/hooks'
import { getIdFromCurrencyPrice } from '@pancakeswap/infinity-sdk'
import { useTranslation } from '@pancakeswap/localization'
import {
  AutoRow,
  BalanceInput,
  Box,
  BoxProps,
  Button,
  FlexGap,
  PreTitle,
  QuestionHelper,
  Text,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import { escapeRegExp } from '@pancakeswap/utils/escapeRegExp'
import { formatPrice } from '@pancakeswap/utils/formatFractions'
import { GreyCard } from '@pancakeswap/widgets-internal'
import BigNumber from 'bignumber.js'
import { usePoolMarketPrice } from 'hooks/usePoolMarketPriceSlippage'
import { tryParsePrice } from 'hooks/v3/utils'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useActiveIdQueryState, useBinStepQueryState, useStartingPriceQueryState } from 'state/infinity/create'
import { useBinRangeQueryState, useClRangeQueryState, useInverted } from 'state/infinity/shared'
import styled from 'styled-components'
import { truncateText } from 'utils'
import { useCurrencies } from '../hooks/useCurrencies'
import { useInfinityCreateFormQueryState } from '../hooks/useInfinityFormState/useInfinityFormQueryState'

export type FieldStartingPriceProps = BoxProps

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`) // match escaped "." characters via in a non-capturing group

export const FieldStartingPrice: React.FC<FieldStartingPriceProps> = ({ ...boxProps }) => {
  const { t } = useTranslation()
  const { quoteCurrency, baseCurrency, currency0, currency1 } = useCurrencies()
  const { isBin } = useInfinityCreateFormQueryState()
  const [startPrice, setStartPrice] = useStartingPriceQueryState()
  const [binStep] = useBinStepQueryState()
  const [activeId, setActiveId] = useActiveIdQueryState()
  const [, setBinRange] = useBinRangeQueryState()
  const [, setTick] = useClRangeQueryState()
  const { isMobile, isTablet } = useMatchBreakpoints()
  const MAX_SYMBOL_LENGTH = isMobile || isTablet ? 12 : 7
  const unit = useMemo(() => {
    return truncateText(quoteCurrency?.symbol, MAX_SYMBOL_LENGTH)
  }, [quoteCurrency, MAX_SYMBOL_LENGTH])
  const isMounted = useIsMounted()
  const [inverted] = useInverted()
  const prevInverted = usePreviousValue(inverted)
  const [forceSynced, setForceSynced] = useState(false)

  const [, , marketPrice] = usePoolMarketPrice(currency0, currency1)

  const updatePriceToBinId = useCallback(
    (value: string) => {
      if (isBin && binStep !== null) {
        const price = inverted
          ? tryParsePrice(currency1, currency0, new BigNumber(value).toJSON())
          : tryParsePrice(currency0, currency1, new BigNumber(value).toJSON())
        if (!price) {
          setActiveId(null)
        } else {
          const newActiveId = getIdFromCurrencyPrice(inverted ? price.invert() : price, binStep)
          setActiveId(newActiveId)
        }
      }
    },
    [binStep, currency0, currency1, inverted, isBin, setActiveId],
  )

  const updatePrice = useCallback(
    (input: string | null) => {
      if (input === null) return
      if (input === '') {
        setStartPrice(null)
        if (isBin) {
          setActiveId(null)
          setBinRange({ lowerBinId: null, upperBinId: null })
        } else {
          setTick({ lowerTick: null, upperTick: null })
        }
      } else {
        const value = new BigNumber(input).toJSON()

        setStartPrice(value)

        updatePriceToBinId(value)
      }
    },
    [isBin, setActiveId, setBinRange, setStartPrice, setTick, updatePriceToBinId],
  )

  // force sync initial bin activeId with start price
  useEffect(() => {
    if (
      isMounted &&
      !forceSynced &&
      baseCurrency &&
      quoteCurrency &&
      isBin &&
      binStep !== null &&
      startPrice !== null
    ) {
      updatePriceToBinId(startPrice)
      setForceSynced(true)
    }
  }, [
    isBin,
    binStep,
    startPrice,
    setActiveId,
    activeId,
    baseCurrency,
    quoteCurrency,
    isMounted,
    inverted,
    updatePrice,
    updatePriceToBinId,
    forceSynced,
  ])

  useEffect(() => {
    if (isMounted && prevInverted !== inverted && startPrice !== null) {
      const newPrice = prevInverted
        ? tryParsePrice(quoteCurrency, baseCurrency, startPrice.toString())
        : tryParsePrice(baseCurrency, quoteCurrency, startPrice.toString())
      const revertPrice = newPrice?.invert()
      updatePrice(revertPrice?.denominator ? revertPrice.toFixed(8) : null)
    }
  }, [prevInverted, inverted, isMounted, startPrice, updatePrice, quoteCurrency, baseCurrency])

  const handleSetMarketPrice = useCallback(() => {
    if (marketPrice) {
      const price = inverted ? marketPrice.invert() : marketPrice
      const formattedPrice = formatPrice(price)
      if (!formattedPrice) return
      updatePrice(formattedPrice)
    }
  }, [inverted, marketPrice, updatePrice])

  // const startPriceAsFraction = useStartPriceAsFraction()
  return (
    <Box {...boxProps}>
      {/* <pre>startPrice: {startPrice}</pre>
      <pre>activeId: {activeId}</pre>

      <pre>
        startPriceAsFraction:{' '}
        {startPriceAsFraction && startPriceAsFraction.denominator !== 0n ? startPriceAsFraction?.toFixed(8) : ''}
      </pre>
      <pre>inverted: {inverted?.toString()}</pre> */}
      {/* <span>startPrice: {startPrice}</span> */}
      <ResponsiveTwoColumns mt="0px">
        <FlexGap mt={['16px', '16px', '16px', '16px', '16px', '0']} gap="5px" alignItems="center">
          <PreTitle>{t('Set Starting Price')}</PreTitle>
        </FlexGap>

        <StartingPriceInput value={startPrice} onUserInput={updatePrice} unit={unit} />
      </ResponsiveTwoColumns>
      {marketPrice ? (
        <GreyCard mt="8px" padding="12px">
          <AutoRow alignItems="center" justifyContent="space-between">
            <FlexGap alignItems="center" gap="4px">
              <Text fontSize="12px">
                {formatPrice(inverted ? marketPrice.invert() : marketPrice)}{' '}
                {t('%assetA% per %assetB%', {
                  assetA: inverted ? currency0?.symbol : currency1?.symbol,
                  assetB: inverted ? currency1?.symbol : currency0?.symbol,
                })}
              </Text>
              <QuestionHelper
                placement="bottom"
                color="textSubtle"
                text={t('The price is estimated from the market price. Please verify it before using it.')}
              />
            </FlexGap>
            <Button scale="xs" variant="tertiary" onClick={handleSetMarketPrice}>
              {t('Use this Price')}
            </Button>
          </AutoRow>
        </GreyCard>
      ) : null}
    </Box>
  )
}

type StartingPriceInputProps = {
  value: string | null
  onUserInput: (input: string) => void
  unit: string
}

const StartingPriceInput: React.FC<StartingPriceInputProps> = ({ value, onUserInput, unit }) => {
  const [inputValue, setInputValue] = useState<string | null>(value)
  const isMounted = useIsMounted()

  useEffect(() => {
    if (!isMounted) return
    if (value === null && inputValue !== null) {
      setInputValue(null)
      return
    }
    if (
      value !== null &&
      inputValue !== null &&
      parseFloat(inputValue) !== parseFloat(value) &&
      !String(value).endsWith('.')
    ) {
      setInputValue(value)
      return
    }

    if (inputValue === null && value !== null) {
      setInputValue(value)
    }
  }, [inputValue, isMounted, value])

  const handleInputChange = useCallback(
    (input: string) => {
      const v = input.replace(/,/g, '.')
      if (v === '' || inputRegex.test(escapeRegExp(v))) {
        setInputValue(v)

        if (v.endsWith('.')) return
        onUserInput(v)
      }
    },
    [onUserInput],
  )

  return (
    <BalanceInput
      value={inputValue ?? ''}
      onUserInput={handleInputChange}
      unit={unit}
      placeholder="0.00"
      inputProps={{
        style: { height: '24px' },
        step: 'any',
        pattern: '^[0-9]*[.,]?[0-9]{0,18}$',
        inputMode: 'decimal',
      }}
    />
  )
}

const ResponsiveTwoColumns = styled(Box)`
  display: grid;
  grid-column-gap: 32px;
  grid-row-gap: 16px;
  grid-template-columns: 1fr;

  grid-template-rows: max-content;
  grid-auto-flow: row;

  ${({ theme }) => theme.mediaQueries.xl} {
    grid-template-columns: 1fr 1fr;
  }
`
