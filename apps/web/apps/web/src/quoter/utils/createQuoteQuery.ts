import { INFINITY_SUPPORTED_CHAINS } from '@pancakeswap/infinity-sdk'
import { PoolQuery, PoolQueryOptions, QuoteQuery } from 'quoter/quoter.types'
import { getViemClients } from 'utils/viem'
import { PoolHashHelper } from './PoolHashHelper'

const PLACE_HOLDER_TIME = 1000 * 120 // 2 minutes

const cache = new Map<string, QuoteQuery>()
export function createQuoteQuery(query: Omit<QuoteQuery, 'hash' | 'createTime'>): QuoteQuery {
  const hash = PoolHashHelper.hashQuoteQuery(query as QuoteQuery)

  if (cache.has(hash)) {
    return cache.get(hash) as QuoteQuery
  }

  const option1 = { ...(query as QuoteQuery) }
  option1.hash = hash
  option1.createTime = Date.now()
  const placeholderNonce = Math.floor(Date.now() / PLACE_HOLDER_TIME)
  option1.placeholderHash = PoolHashHelper.hashPlaceHolderQuoteQuery({ ...option1, nonce: placeholderNonce })
  option1.provider = getViemClients
  cache.set(hash, option1)

  return option1
}

export const createPoolQuery = (quoteQuery: QuoteQuery, controller?: AbortController) => {
  const { baseCurrency, currency } = quoteQuery
  const poolQuery: PoolQuery = {
    currencyA: baseCurrency!,
    currencyB: currency!,
    chainId: currency!.chainId,
    blockNumber: quoteQuery.blockNumber,
  }

  const poolOptions: PoolQueryOptions = {
    infinity: quoteQuery.infinitySwap && INFINITY_SUPPORTED_CHAINS.includes(currency!.chainId),
    v2Pools: !!quoteQuery.v2Swap,
    v3Pools: !!quoteQuery.v3Swap,
    stableSwap: !!quoteQuery.stableSwap,
    provider: quoteQuery.provider,
    for: quoteQuery.for,
    gasLimit: quoteQuery.gasLimit,
    signal: controller?.signal,
  }
  return {
    poolQuery,
    poolOptions,
  }
}
