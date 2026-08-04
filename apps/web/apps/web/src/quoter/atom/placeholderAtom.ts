import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { InterfaceOrder } from 'views/Swap/utils'

export const placeholderAtom = atomFamily((_: string) => {
  return atom<InterfaceOrder | undefined>(undefined)
})

export const updatePlaceholderAtom = atom(null, (_get, set, hash: string, order: InterfaceOrder | undefined) => {
  set(placeholderAtom(hash), order)
})
