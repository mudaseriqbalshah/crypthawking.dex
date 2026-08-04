import { SORT_ORDER } from '@pancakeswap/uikit'
import { INetworkProps, IProtocolMenuProps } from '@pancakeswap/widgets-internal'
import { accountActiveChainAtom } from 'hooks/useAccountActiveChain'
import { atom } from 'jotai'
import { FarmQuery } from 'state/farmsV4/search/edgeFarmQueries'
import { DEFAULT_CHAINS } from 'state/farmsV4/state/farmPools/fetcher'
import { getProtocolsByIndex, parseUrlToSearchQuery } from '../utils/queryParser'

const _searchQueryAtom = atom<FarmQuery>(parseUrlToSearchQuery())
export const searchQueryAtom = atom((get) => {
  const { chainId } = get(accountActiveChainAtom)
  const query = get(_searchQueryAtom)
  return {
    ...query,
    activeChainId: chainId,
  }
})

type UpdateFilterParams = Partial<{
  selectedProtocolIndex?: IProtocolMenuProps['activeIndex']
  selectedNetwork?: INetworkProps['value']
  search?: string
}>

export const updateFilterAtom = atom(null, (_, set, filter: UpdateFilterParams) => {
  const { search, selectedNetwork, selectedProtocolIndex } = filter
  const protocols = getProtocolsByIndex(selectedProtocolIndex)
  const chains = selectedNetwork || DEFAULT_CHAINS

  set(_searchQueryAtom, (prev) => {
    return {
      ...prev,
      keywords: typeof search === 'undefined' ? prev.keywords : search || '',
      protocols: typeof selectedProtocolIndex === 'undefined' ? prev.protocols : protocols,
      chains: typeof selectedNetwork === 'undefined' ? prev.chains : chains,
    }
  })
})

export const updateSortAtom = atom(null, (_, set, sort: { order: SORT_ORDER; dataIndex: string }) => {
  set(_searchQueryAtom, (prev) => {
    const sortOrder = sort.order === SORT_ORDER.DESC ? sort.order : 0
    const sortBy = (sortOrder === SORT_ORDER.DESC ? sort.dataIndex : '') as FarmQuery['sortBy']

    return {
      ...prev,
      sortBy,
      sortOrder,
    }
  })
})
