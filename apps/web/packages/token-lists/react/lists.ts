import { nanoid } from '@reduxjs/toolkit'
import { atom, useAtom, useAtomValue } from 'jotai'
import { atomFamily, atomWithStorage, loadable } from 'jotai/utils'
import { type AsyncStorage } from 'jotai/vanilla/utils/atomWithStorage'
import localForage from 'localforage'
import { fetchTokenList } from './actions'
import { getTokenList } from './getTokenList'
import { ListsState } from './reducer'

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

const noopStorage: AsyncStorage<any> = {
  getItem: () => Promise.resolve(noop()),
  setItem: () => Promise.resolve(noop()),
  removeItem: () => Promise.resolve(noop()),
}

// eslint-disable-next-line symbol-description
const EMPTY = Symbol()

export function findTokenByAddress(state: ListsState, chainId: number, address: string) {
  const urls = state.activeListUrls ?? Object.keys(state.byUrl)
  for (const url of urls) {
    const list = state.byUrl[url]?.current
    const token = list?.tokens.find((t) => t.chainId === chainId && t.address.toLowerCase() === address.toLowerCase())
    if (token) return token
  }
  return undefined
}

export function findTokenBySymbol(state: ListsState, chainId: number, symbol: string) {
  const urls = state.activeListUrls ?? Object.keys(state.byUrl)
  for (const url of urls) {
    const list = state.byUrl[url]?.current
    const token = list?.tokens.find((t) => t.chainId === chainId && t.symbol.toLowerCase() === symbol.toLowerCase())
    if (token) return token
  }
  return undefined
}

export const createListsAtom = (storeName: string, reducer: any, initialState: any) => {
  /**
   * Persist you redux state using IndexedDB
   * @param {string} dbName - IndexedDB database name
   */
  function IndexedDBStorage<Value>(dbName: string): AsyncStorage<Value> {
    if (typeof window !== 'undefined') {
      const db = localForage.createInstance({
        name: dbName,
        storeName,
      })
      return {
        getItem: async (key: string) => {
          const value = await db.getItem(key)
          if (value) {
            return value
          }
          return initialState
        },
        setItem: async (k: string, v: any) => {
          if (v === EMPTY) return
          await db.setItem(k, v)
        },
        removeItem: db.removeItem,
      }
    }
    return noopStorage
  }

  const listsStorageAtom = atomWithStorage<ListsState | typeof EMPTY>('lists', EMPTY, IndexedDBStorage('lists'))

  const defaultStateAtom = atom<ListsState, any, void>(
    (get) => {
      const value = get(loadable(listsStorageAtom))
      if (value.state === 'hasData' && value.data !== EMPTY) {
        return value.data
      }
      return initialState
    },
    async (get, set, action) => {
      set(listsStorageAtom, reducer(await get(defaultStateAtom), action))
    },
  )

  const isReadyAtom = loadable(listsStorageAtom)

  const tokenAtom = atomFamily((key: { chainId: number; address: string }) =>
    atom((get) => findTokenByAddress(get(defaultStateAtom), key.chainId, key.address)),
  )

  const tokenBySymbolAtom = atomFamily((key: { chainId: number; symbol: string }) =>
    atom((get) => findTokenBySymbol(get(defaultStateAtom), key.chainId, key.symbol)),
  )

  const fetchListAtom = atom<null, [string], Promise<void>>(null, async (get, set, url) => {
    const state = get(defaultStateAtom)
    const listState = state.byUrl[url]
    if (listState?.current || listState?.loadingRequestId) {
      return
    }

    const requestId = nanoid()
    set(defaultStateAtom, fetchTokenList.pending({ url, requestId }))

    try {
      const tokenList = await getTokenList(url)
      set(defaultStateAtom, fetchTokenList.fulfilled({ url, tokenList: tokenList!, requestId }))
    } catch (error: any) {
      set(defaultStateAtom, fetchTokenList.rejected({ url, requestId, errorMessage: error.message }))
    }
  })

  function useListState() {
    return useAtom(defaultStateAtom)
  }

  function useListStateReady() {
    const value = useAtomValue(isReadyAtom)
    return value.state === 'hasData' && value.data !== EMPTY
  }

  return {
    listsAtom: defaultStateAtom,
    tokenAtom,
    tokenBySymbolAtom,
    fetchListAtom,
    useListStateReady,
    useListState,
  }
}
