import { TokenInfo, TokenList } from '@pancakeswap/token-lists'
import { getTokenList } from '@pancakeswap/token-lists/react'
import { cacheByLRU } from '@pancakeswap/utils/cacheByLRU'
import { BASE_URL } from 'config'
import { DEFAULT_ACTIVE_LIST_URLS } from 'config/constants/lists'
import keyBy from 'lodash/keyBy'
import { checksumAddress } from 'utils/checksumAddress'
import { getHomeCacheSettings } from './settings'

export const _queryTokenList = async () => {
  // getTokenList() -> uriToHttp() passes relative paths through unchanged (assuming a
  // browser fetch() call resolves them against the current origin). This runs
  // server-side (API route), where there is no implicit origin, so absolutize first.
  const list = DEFAULT_ACTIVE_LIST_URLS.map((url) => (url.startsWith('/') ? `${BASE_URL}${url}` : url))

  const results = await Promise.allSettled(list.map((url) => getTokenList(url)))
  const allFailed = results.every((result) => result.status === 'rejected')

  if (allFailed) {
    throw new Error('All token list failed')
  }
  const lists = results
    .filter((result): result is PromiseFulfilledResult<TokenList> => result.status === 'fulfilled')
    .map((result) => result.value.tokens)
    .flat()
    .map((x) => ({ ...x, address: checksumAddress(x.address) }))
    .filter((x) => x.address) as TokenInfo[]

  return keyBy(lists, (x) => `${x.chainId}-${x.address}`)
}

export const queryTokenList = cacheByLRU(_queryTokenList, getHomeCacheSettings('token-map-v2'))
