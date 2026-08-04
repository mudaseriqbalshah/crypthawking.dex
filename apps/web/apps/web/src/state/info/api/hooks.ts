import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { ChainId } from '@pancakeswap/chains'
import type { components } from './schema'
import { chainIdToExplorerInfoChainName } from './client'

export const useExplorerChainNameByQuery = (): components['schemas']['ChainName'] | undefined => {
  const { query, isReady } = useRouter()

  const chainName = useMemo(() => {
    const queryChainName = query?.chainName ?? query.chain
    switch (queryChainName) {
      case 'bscTestnet':
      case 'bsc-testnet':
        return chainIdToExplorerInfoChainName[ChainId.BSC_TESTNET]
      case 'eth':
        return 'ethereum'
      case 'polygon-zkevm':
        return 'polygon-zkevm'
      case 'zksync':
        return 'zksync'
      case 'arb':
        return 'arbitrum'
      case 'linea':
        return 'linea'
      case 'base':
        return 'base'
      case 'opbnb':
        return 'opbnb'
      default:
        return 'bsc'
    }
  }, [query])

  return isReady ? chainName : undefined
}
