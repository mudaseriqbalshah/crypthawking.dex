import { ChainId } from '@pancakeswap/chains'
import { CHAINS } from 'config/chains'
import { ASSET_CDN } from 'config/constants/endpoints'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { useMemo } from 'react'
import { useUserShowTestnet } from 'state/user/hooks/useUserShowTestnet'

export const MAINNET_CHAINS = CHAINS.filter((chain) => {
  if ('testnet' in chain && chain.testnet && chain.id !== ChainId.BSC_TESTNET && chain.id !== ChainId.MONAD_TESTNET) {
    return false
  }
  return true
})

export const useAllChain = () => {
  const [showTestnet] = useUserShowTestnet()
  return useMemo(
    () =>
      CHAINS.filter((chain) => {
        if ('testnet' in chain && chain.testnet && chain.id !== ChainId.MONAD_TESTNET) {
          return showTestnet
        }
        return true
      }),
    [showTestnet],
  )
}

export const useAllChainIds = () => {
  const allChains = useAllChain()
  return useMemo(() => allChains.map((chain) => chain.id), [allChains])
}

export const useAllChainsOpts = () => {
  const chains = useAllChain()
  return chains.map((chain) => ({
    icon: `${ASSET_CDN}/web/chains/${chain.id}.png`,
    value: chain.id,
    label: chain.name,
  }))
}

export const useOrderChainIds = () => {
  const allChainIds = useAllChainIds()
  const { chainId: activeChainId } = useActiveChainId()
  const othersChains = useMemo(() => allChainIds.filter((id) => id !== activeChainId), [allChainIds, activeChainId])
  const orderedChainIds = useMemo(() => [activeChainId, ...othersChains], [activeChainId, othersChains])
  return {
    activeChainId,
    othersChains,
    orderedChainIds,
  }
}
