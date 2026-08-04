import { isTestnetChainId } from '@pancakeswap/chains'
import { Currency, getCurrencyAddress } from '@pancakeswap/sdk'
import { useQuery } from '@tanstack/react-query'

import { SLOW_INTERVAL } from 'config/constants'
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { usdPriceBatcher } from 'utils/batcher'

type Config = {
  enabled?: boolean
}

export function useCurrencyUsdPrice(currency: Currency | undefined | null, { enabled = true }: Config = {}) {
  return useQuery<number>({
    queryKey: ['currencyPrice', currency?.chainId, currency?.wrapped.address],
    queryFn: async () => {
      if (!currency) {
        throw new Error('No currency provided')
      }
      return usdPriceBatcher.fetch(currency)
    },
    staleTime: SLOW_INTERVAL,
    refetchInterval: SLOW_INTERVAL,
    enabled: Boolean(enabled && currency),
  })
}

export const currencyUSDPriceAtom = atomFamily(
  (currency?: Currency) => {
    return atom(() => {
      if (!currency) {
        throw new Error('No currency provided')
      }
      if (isTestnetChainId(currency?.chainId)) {
        return 0
      }
      return usdPriceBatcher.fetch(currency)
    })
  },
  (a, b) => {
    if (a === b) {
      return true
    }
    if (!a || !b) {
      return false
    }
    return getCurrencyAddress(a) === getCurrencyAddress(b)
  },
)

export const currenciesUSDPriceAtom = atomFamily(
  (currencies: Currency[]) => {
    return atom(async (get) => {
      return Promise.all(currencies.map((currency) => get(currencyUSDPriceAtom(currency))))
    })
  },
  (a, b) => {
    if (a === b) {
      return true
    }
    if (a.length !== b.length) {
      return false
    }
    return a.every((currency, index) => getCurrencyAddress(currency) === getCurrencyAddress(b[index]))
  },
)
