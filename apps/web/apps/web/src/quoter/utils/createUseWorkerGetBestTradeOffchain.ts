import { InfinityRouter, SmartRouter } from '@pancakeswap/smart-router'
import { useGlobalWorker } from 'hooks/useWorker'
import { useCallback } from 'react'
import { GetBestTradeParams, InfinityGetBestTradeReturnType, NoValidRouteError } from '../quoter.types'
import { getVerifiedTrade } from './getVerifiedTrade'

export function createUseWorkerGetBestTradeOffchain() {
  return function useWorkerGetBestTradeOffchain(): (
    ...args: GetBestTradeParams
  ) => Promise<InfinityGetBestTradeReturnType | null> {
    const worker = useGlobalWorker()

    return useCallback(
      async (
        amount,
        currency,
        tradeType,
        { maxHops, allowedPoolTypes, gasPriceWei, signal, poolProvider, maxSplits },
      ) => {
        if (!worker) {
          throw new Error('Quote worker not initialized')
        }
        const [candidatePoolsResult, gasPriceResult] = await Promise.allSettled([
          poolProvider.getCandidatePools({
            currencyA: amount.currency,
            currencyB: currency,
            protocols: allowedPoolTypes,
          }),
          typeof gasPriceWei === 'function' ? gasPriceWei() : Promise.resolve(gasPriceWei),
        ])
        if (candidatePoolsResult.status === 'rejected') {
          throw new Error('Failed to get candidate pools')
        }
        const { value: candidatePools } = candidatePoolsResult
        try {
          const result = await worker.getBestTradeOffchain({
            chainId: currency.chainId,
            currency: SmartRouter.Transformer.serializeCurrency(currency),
            tradeType,
            amount: {
              currency: SmartRouter.Transformer.serializeCurrency(amount.currency),
              value: amount.quotient.toString(),
            },
            gasPriceWei: gasPriceResult.status === 'fulfilled' ? gasPriceResult.value.toString() : undefined,
            maxHops,
            maxSplits,
            candidatePools: candidatePools.map(SmartRouter.Transformer.serializePool),
            signal,
          })
          if (!result) {
            throw new NoValidRouteError()
          }
          const trade = InfinityRouter.Transformer.parseTrade(currency.chainId, result) ?? null
          const verifiedTrade = await getVerifiedTrade(trade)
          return (verifiedTrade || null) as InfinityGetBestTradeReturnType | null
        } catch (e) {
          console.warn(e)
          throw new NoValidRouteError()
        }
      },
      [worker],
    )
  }
}
