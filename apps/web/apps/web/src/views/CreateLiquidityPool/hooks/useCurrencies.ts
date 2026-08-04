import { useIsMounted } from '@pancakeswap/hooks'
import { Native } from '@pancakeswap/sdk'
import { Currency, sortCurrencies } from '@pancakeswap/swap-sdk-core'
import { useSelectIdRouteParams } from 'hooks/dynamicRoute/useSelectIdRoute'
import { useCurrencyByChainId } from 'hooks/Tokens'
import { useEffect, useMemo } from 'react'
import { useInverted } from 'state/infinity/shared'

const isCurrencyIdSorted = (chainId: number, currencyIdA: string, currencyIdB: string) => {
  const nativeCurrency = Native.onChain(chainId)
  if (currencyIdA.toUpperCase() === nativeCurrency.symbol.toUpperCase()) return true
  if (currencyIdB.toUpperCase() === nativeCurrency.symbol.toUpperCase()) return false

  return currencyIdA.toLowerCase() < currencyIdB.toLowerCase()
}

export const useCurrencies = () => {
  const { currencyIdA: baseCurrencyId, currencyIdB: quoteCurrencyId, chainId } = useSelectIdRouteParams()
  const [inverted, setInverted] = useInverted()

  const baseCurrency = useCurrencyByChainId(baseCurrencyId, chainId)
  const quoteCurrency = useCurrencyByChainId(quoteCurrencyId, chainId)

  const [currency0, currency1] = useMemo(() => {
    let c0: Currency | undefined
    let c1: Currency | undefined

    if (baseCurrency && quoteCurrency) {
      ;[c0, c1] = sortCurrencies([baseCurrency, quoteCurrency])
    }

    return [c0, c1]
  }, [baseCurrency, quoteCurrency])

  const isInverted = useMemo(() => {
    if (!baseCurrencyId || !quoteCurrencyId || !chainId) return null
    return !isCurrencyIdSorted(chainId, baseCurrencyId, quoteCurrencyId)
  }, [baseCurrencyId, chainId, quoteCurrencyId])

  const isMounted = useIsMounted()

  useEffect(() => {
    if (isInverted !== null && inverted !== null && inverted !== isInverted) {
      setInverted(isInverted)
    }
  }, [inverted, isInverted, isMounted, setInverted])

  useEffect(() => {
    if (isMounted && inverted === null && isInverted !== null) {
      setInverted(isInverted)
    }
  }, [inverted, isInverted, isMounted, setInverted])

  return {
    currency0,
    currency1,
    baseCurrency,
    quoteCurrency,
  }
}
