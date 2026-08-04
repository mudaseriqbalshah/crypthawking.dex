import { INFINITY_SUPPORTED_CHAINS } from '@pancakeswap/infinity-sdk'
import { isStableSwapSupported } from '@pancakeswap/stable-swap-sdk'
import { Select } from '@pancakeswap/uikit'
import { ASSET_CDN } from 'config/constants/endpoints'
import { DISABLED_ADD_LIQUIDITY_CHAINS } from 'config/constants/liquidity'
import { useMemo } from 'react'
import { useUserShowTestnet } from 'state/user/hooks/useUserShowTestnet'
import { LiquidityType } from 'utils/types'
import { chains } from 'utils/wagmi'
import { Chain, monadTestnet } from 'wagmi/chains'

interface NetworkSelectorProps {
  chainId?: number
  version?: LiquidityType
  onChange?: (chain: Chain) => void
}

// TODO: should design in a better way to rely on infinity
// This should be a standalone component
export const NetworkSelector = ({
  version,
  onChange,
  chainId = INFINITY_SUPPORTED_CHAINS[0],
}: NetworkSelectorProps) => {
  const [showTestnet] = useUserShowTestnet()

  const chainList = useMemo(
    () =>
      chains
        .filter((chain) => !DISABLED_ADD_LIQUIDITY_CHAINS[chain.id])
        .filter((chain) => version !== 'infinity' || INFINITY_SUPPORTED_CHAINS.includes(chain.id))
        .filter((chain) => version !== 'stableSwap' || isStableSwapSupported(chain.id))
        .filter((chain) => {
          if (chain.id === chainId) return true
          if ('testnet' in chain && chain.testnet && chain.id !== monadTestnet.id) return showTestnet
          return true
        }),
    [version, chainId, showTestnet],
  )

  return (
    <Select
      options={chainList.map((chain) => ({
        label: chain.name,
        value: chain,
        imageUrl: `${ASSET_CDN}/web/chains/${chain.id}.png`,
      }))}
      onOptionChange={(option) => onChange?.(option.value)}
      defaultOptionIndex={
        // Note: index needs to be plus one because of this:
        // packages/uikit/src/components/Select/Select.tsx:129
        chainList.findIndex((chain) => chain.id === chainId) + 1
      }
      style={{
        zIndex: 30,
      }}
      listStyle={{
        maxHeight: '45vh',
        overflowY: 'auto',
      }}
      textStyle={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingRight: '16px',
      }}
    />
  )
}
