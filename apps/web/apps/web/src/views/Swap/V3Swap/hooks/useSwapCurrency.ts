import { Currency } from '@pancakeswap/swap-sdk-core'
import { useCurrency } from 'hooks/Tokens'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'

interface SwapStateCurrency {
  readonly currencyId: string | undefined
  readonly chainId: number | undefined
}

export const useSwapCurrencyIds = (): [SwapStateCurrency | undefined, SwapStateCurrency | undefined] => {
  const { [Field.INPUT]: inputCurrency, [Field.OUTPUT]: outputCurrency } = useSwapState()

  return [inputCurrency, outputCurrency]
}

export const useSwapCurrency = (): [Currency | undefined, Currency | undefined] => {
  const [stateInputCurrency, stateOutputCurrency] = useSwapCurrencyIds()

  const inputCurrency = useCurrency(stateInputCurrency?.currencyId, stateInputCurrency?.chainId) as Currency
  const outputCurrency = useCurrency(stateOutputCurrency?.currencyId, stateOutputCurrency?.chainId) as Currency

  return [inputCurrency, outputCurrency]
}
