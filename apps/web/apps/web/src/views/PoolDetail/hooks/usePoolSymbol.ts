import { Token, getCurrencyAddress } from '@pancakeswap/swap-sdk-core'
import { useCurrencyByChainId } from 'hooks/Tokens'
import { useMemo } from 'react'
import { useChainIdByQuery } from 'state/info/hooks'
import { getTokenSymbolAlias } from 'utils/getTokenAlias'
import { zeroAddress } from 'viem'
import { usePoolInfoByQuery } from './usePoolInfo'

export const usePoolSymbol = () => {
  const poolInfo = usePoolInfoByQuery()
  const chainId = useChainIdByQuery()

  const currency0 =
    useCurrencyByChainId(poolInfo?.token0 ? getCurrencyAddress(poolInfo.token0) : undefined, chainId) ?? undefined
  const currency1 =
    useCurrencyByChainId(poolInfo?.token1 ? getCurrencyAddress(poolInfo.token1) : undefined, chainId) ?? undefined

  const [poolSymbol, symbol0, symbol1] = useMemo(() => {
    const s0 = currency0?.isNative
      ? currency0?.symbol
      : getTokenSymbolAlias(currency0?.wrapped.address, chainId, currency0?.wrapped.symbol) ?? ''
    const s1 = getTokenSymbolAlias(currency1?.wrapped.address, chainId, currency1?.wrapped.symbol) ?? ''
    return [`${s0} / ${s1}`, s0, s1]
  }, [
    currency0?.isNative,
    currency0?.symbol,
    currency0?.wrapped.address,
    currency0?.wrapped.symbol,
    chainId,
    currency1?.wrapped.address,
    currency1?.wrapped.symbol,
  ])

  return {
    poolSymbol,
    currency0,
    currency1,
    symbol0,
    symbol1,
  }
}
