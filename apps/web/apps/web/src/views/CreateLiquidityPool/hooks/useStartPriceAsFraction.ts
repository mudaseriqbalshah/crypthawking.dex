import { usePreviousValue } from '@pancakeswap/hooks'
import { getCurrencyPriceFromId } from '@pancakeswap/infinity-sdk'
import { Currency, Price } from '@pancakeswap/swap-sdk-core'
import BigNumber from 'bignumber.js'
import { tryParsePrice } from 'hooks/v3/utils'
import { useMemo } from 'react'
import { useStartingPriceQueryState } from 'state/infinity/create'
import { useInverted } from 'state/infinity/shared'
import { useCurrencies } from './useCurrencies'
import {
  useInfinityBinQueryState,
  useInfinityCreateFormQueryState,
} from './useInfinityFormState/useInfinityFormQueryState'

export const useStartPriceAsFraction = () => {
  const { isBin } = useInfinityCreateFormQueryState()
  const [startPrice] = useStartingPriceQueryState()
  const { activeId, binStep } = useInfinityBinQueryState()
  const { currency0, currency1 } = useCurrencies()
  const [inverted] = useInverted()
  const prevInverted = usePreviousValue(inverted)

  return useMemo(() => {
    if (!currency0 || !currency1) return undefined

    if (isBin) {
      if (activeId === null || binStep === null) return null

      const price = getCurrencyPriceFromId(activeId, binStep, currency0, currency1)
      return inverted ? price.invert() : price
    }

    let price: Price<Currency, Currency> | undefined

    const formattedStartPrice = new BigNumber(startPrice ?? 0).toJSON()

    if (prevInverted !== inverted) {
      price = prevInverted
        ? tryParsePrice(currency1, currency0, formattedStartPrice)
        : tryParsePrice(currency0, currency1, formattedStartPrice)
      return price?.invert()
    }
    return inverted
      ? tryParsePrice(currency1, currency0, formattedStartPrice)
      : tryParsePrice(currency0, currency1, formattedStartPrice)
  }, [currency0, currency1, isBin, prevInverted, startPrice, activeId, binStep, inverted])
}
