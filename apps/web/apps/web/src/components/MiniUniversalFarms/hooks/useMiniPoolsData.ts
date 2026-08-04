import { ISortOrder } from '@pancakeswap/uikit'
import { DEFAULT_ACTIVE_LIST_URLS } from 'config/constants/lists'
import { useTokenListPrepared } from 'hooks/useTokenListPrepared'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useMemo } from 'react'
import { PoolInfo } from 'state/farmsV4/state/type'
import { farmsSearchAtom, farmsSearchPagingAtom } from 'views/universalFarms/atom/farmsSearchAtom'
import { searchQueryAtom, updateSortAtom } from 'views/universalFarms/atom/searchQueryAtom'

interface UseMiniPoolsDataReturn {
  pools: PoolInfo[]
  isLoading: boolean
  loadMore: () => void
  handleSort: (sort: { order: ISortOrder; dataIndex: string | null }) => void
}

export const useMiniPoolsData = (): UseMiniPoolsDataReturn => {
  // Prepare token lists
  const listPrepared = useTokenListPrepared(DEFAULT_ACTIVE_LIST_URLS)

  const query = useAtomValue(searchQueryAtom)

  // Use existing Universal Farms atoms
  const farmSearchResult = useAtomValue(farmsSearchAtom(query))
  const setPaging = useSetAtom(farmsSearchPagingAtom(query))

  const pools = useMemo(() => farmSearchResult.unwrapOr([]), [farmSearchResult])

  const updateSort = useSetAtom(updateSortAtom)

  const isLoading = useMemo(
    () => pools.length === 0 && (farmSearchResult.isPending() || listPrepared.isPending()),
    [pools, farmSearchResult, listPrepared],
  )

  const loadMore = useCallback(() => {
    setPaging((prev) => (prev ?? 0) + 1)
  }, [setPaging])

  const handleSort = useCallback(
    ({ order, dataIndex }) => {
      updateSort({
        order,
        dataIndex,
      })
    },
    [query],
  )

  return {
    pools,
    isLoading,
    loadMore,
    handleSort,
  }
}
