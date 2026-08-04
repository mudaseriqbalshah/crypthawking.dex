import { useAtom, useAtomValue } from 'jotai'
import { atomWithProxy } from 'jotai-valtio'
import { useEffect } from 'react'
import { proxy } from 'valtio'
import { useAccount } from 'wagmi'
import { useActiveChainId } from './useActiveChainId'

interface AccountChainState {
  account?: `0x${string}`
  chainId: number | undefined
  isWrongNetwork: boolean
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | null
}

const accountChainProxy = proxy<AccountChainState>({ chainId: undefined, isWrongNetwork: false, status: null })
export const accountActiveChainAtom = atomWithProxy(accountChainProxy)

const useAccountActiveChain = () => {
  const { address: account, status } = useAccount()
  const { chainId, isWrongNetwork } = useActiveChainId()

  const [, setProxy] = useAtom(accountActiveChainAtom)

  useEffect(() => {
    setProxy({ account, chainId, isWrongNetwork, status })
  }, [account, chainId, status, isWrongNetwork, setProxy])

  return useAtomValue(accountActiveChainAtom)
}

export default useAccountActiveChain
