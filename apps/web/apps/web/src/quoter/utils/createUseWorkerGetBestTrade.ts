import { SmartRouter } from '@pancakeswap/smart-router'
import { useGlobalWorker } from 'hooks/useWorker'
import { useCallback } from 'react'
import { NoValidRouteError } from '../quoter.types'

export function createUseWorkerGetBestTrade() {
  return function useWorkerGetBestTrade(): typeof SmartRouter.getBestTrade {
    const worker = useGlobalWorker()

    return useCallback(
      async (
        amount,
        currency,
        tradeType,
        {
          maxHops,
          maxSplits,
          allowedPoolTypes,
          poolProvider,
          gasPriceWei,
          quoteProvider,
          nativeCurrencyUsdPrice,
          quoteCurrencyUsdPrice,
          signal,
        },
      ) => {
        if (!worker) {
          throw new Error('Quote worker not initialized')
        }
        try {
          const candidatePools = await poolProvider.getCandidatePools({
            currencyA: amount.currency,
            currencyB: currency,
            protocols: allowedPoolTypes,
          })

          const quoterConfig = (quoteProvider as ReturnType<typeof SmartRouter.createQuoteProvider>)?.getConfig?.()
          const result = await worker.getBestTrade({
            chainId: currency.chainId,
            currency: SmartRouter.Transformer.serializeCurrency(currency),
            tradeType,
            amount: {
              currency: SmartRouter.Transformer.serializeCurrency(amount.currency),
              value: amount.quotient.toString(),
            },
            gasPriceWei: typeof gasPriceWei !== 'function' ? gasPriceWei?.toString() : undefined,
            maxHops,
            maxSplits,
            poolTypes: allowedPoolTypes,
            candidatePools: candidatePools.map(SmartRouter.Transformer.serializePool),
            onChainQuoterGasLimit: quoterConfig?.gasLimit?.toString(),
            quoteCurrencyUsdPrice,
            nativeCurrencyUsdPrice,
            signal,
          })
          return SmartRouter.Transformer.parseTrade(currency.chainId, result as any)
        } catch (ex) {
          console.warn(ex)
          throw new NoValidRouteError()
        }
      },
      [worker],
    )
  }
}
