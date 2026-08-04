import { useCallback } from 'react'
import { useRouter } from 'next/router'
import { FeeAmount } from '@pancakeswap/v3-sdk'
import { atom, useAtomValue, useSetAtom } from 'jotai'

const currencyInversionEventAtom = atom<{
  currencyIdA: string
  currencyIdB: string
} | null>(null)

interface UseHeaderInvertCurrenciesProps {
  currencyIdA?: string
  currencyIdB?: string
  feeAmount?: FeeAmount
}

export const useHeaderInvertCurrencies = ({ currencyIdA, currencyIdB, feeAmount }: UseHeaderInvertCurrenciesProps) => {
  const router = useRouter()

  const setInversionEvent = useSetAtom(currencyInversionEventAtom)

  const handleInvertCurrencies = useCallback(() => {
    if (currencyIdA && currencyIdB) {
      setInversionEvent({ currencyIdA: currencyIdB, currencyIdB: currencyIdA })
      router.push({
        pathname: router.pathname,
        query: {
          currency: feeAmount ? [currencyIdB!, currencyIdA!, feeAmount?.toString()] : [currencyIdB!, currencyIdA!],
        },
      })
    }
  }, [currencyIdA, currencyIdB, feeAmount, router])

  return { handleInvertCurrencies }
}

export const useCurrencyInversionEvent = () => {
  return useAtomValue(currencyInversionEventAtom)
}
