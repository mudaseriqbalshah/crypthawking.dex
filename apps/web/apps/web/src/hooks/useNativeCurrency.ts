import { ChainId } from '@pancakeswap/chains'
import { Native, NativeCurrency } from '@pancakeswap/sdk'
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { useMemo } from 'react'
import { useActiveChainId } from './useActiveChainId'

export default function useNativeCurrency(overrideChainId?: ChainId): NativeCurrency {
  const { chainId } = useActiveChainId()
  return useMemo(() => {
    try {
      return Native.onChain(overrideChainId ?? chainId ?? ChainId.BSC)
    } catch (e) {
      return Native.onChain(ChainId.BSC)
    }
  }, [overrideChainId, chainId])
}

export const nativeCurrencyAtom = atomFamily((chainId?: ChainId) => {
  return atom(() => {
    try {
      return Native.onChain(chainId ?? ChainId.BSC)
    } catch (e) {
      return Native.onChain(ChainId.BSC)
    }
  })
})
