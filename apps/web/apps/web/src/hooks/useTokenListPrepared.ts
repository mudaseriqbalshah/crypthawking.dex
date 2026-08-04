import { Loadable } from '@pancakeswap/utils/Loadable'
import { useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { fetchListAtom, useListStateReady } from 'state/lists/lists'

export const useTokenListPrepared = (urls: string[]) => {
  const isReady = useListStateReady()

  const fetchList = useSetAtom(fetchListAtom)
  const [flag, setFlag] = useState<Loadable<boolean>>(Loadable.Pending())

  const load = useCallback(async () => {
    if (isReady) {
      await Promise.allSettled(urls.map((url) => fetchList(url)))
      setFlag(Loadable.Just(true))
    }
  }, [urls, isReady])

  useEffect(() => {
    load()
  }, [urls])

  return flag
}
