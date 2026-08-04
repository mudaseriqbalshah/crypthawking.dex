import { getCurrencyAddress } from '@pancakeswap/swap-sdk-core'
import { useModalV2 } from '@pancakeswap/uikit'
import { BIG_ZERO } from '@pancakeswap/utils/bigNumber'
import BigNumber from 'bignumber.js'
import { useCurrencyByChainId } from 'hooks/Tokens'
import { useEffect, useMemo } from 'react'
import { AprInfo, usePoolApr } from 'state/farmsV4/hooks'
import { InfinityPoolInfo, PoolInfo } from 'state/farmsV4/state/type'
import { isInfinityProtocol } from 'utils/protocols'
import { useMyPositions } from 'views/PoolDetail/components/MyPositionsContext'

import { APRBreakdownModal } from './AprBreakdownModal'
import { PoolAprButtonV3 } from './PoolAprButtonV3'

type PoolGlobalAprButtonProps = {
  pool: PoolInfo
  detailMode?: boolean
  aprInfo?: AprInfo
  showApyText?: boolean
  showApyButton?: boolean
  fontSize?: string
  color?: string
}

export const PoolGlobalAprButtonV3: React.FC<PoolGlobalAprButtonProps> = ({
  pool,
  detailMode,
  aprInfo,
  showApyText,
  showApyButton,
  fontSize,
  color = 'secondary',
}) => {
  const key = useMemo(() => `${pool.chainId}:${pool.lpAddress}` as const, [pool.chainId, pool.lpAddress])

  const hookAprInfo = usePoolApr(key, pool, !pool.stableSwapAddress && !aprInfo, !aprInfo)
  const { lpApr, merklApr, cakeApr } = aprInfo ?? hookAprInfo

  const numerator = useMemo(() => {
    const lpAprNumerator = new BigNumber(lpApr).times(cakeApr?.userTvlUsd ?? BIG_ZERO)
    return lpAprNumerator
  }, [lpApr, cakeApr?.userTvlUsd])
  const denominator = useMemo(() => {
    return cakeApr?.userTvlUsd ?? BIG_ZERO
  }, [cakeApr?.userTvlUsd])

  const { chainId, token0, token1 } = pool
  const currency0 = useCurrencyByChainId(getCurrencyAddress(token0), chainId)
  const currency1 = useCurrencyByChainId(getCurrencyAddress(token1), chainId)

  const { totalApr, updateTotalApr } = useMyPositions()

  useEffect(() => {
    if (
      detailMode &&
      (pool.protocol === 'v2' || pool.protocol === 'stable') &&
      (totalApr[key]?.numerator !== numerator || totalApr[key]?.denominator !== denominator)
    ) {
      updateTotalApr(key, numerator, denominator)
    }
  }, [cakeApr, denominator, detailMode, key, lpApr, merklApr, numerator, pool.protocol, updateTotalApr, totalApr])

  const APRBreakdownModalState = useModalV2()

  if (!isInfinityProtocol(pool.protocol)) {
    return (
      <PoolAprButtonV3
        pool={pool}
        lpApr={parseFloat(lpApr) || 0}
        cakeApr={cakeApr}
        merklApr={parseFloat(merklApr) ?? 0}
        showApyText={showApyText}
        showApyButton={showApyButton}
        fontSize={fontSize}
        color={color}
      />
    )
  }

  return (
    <>
      <PoolAprButtonV3
        pool={pool}
        lpApr={parseFloat(lpApr) || 0}
        cakeApr={cakeApr}
        merklApr={parseFloat(merklApr) ?? 0}
        onAPRTextClick={APRBreakdownModalState.onOpen}
        showApyButton={false}
        showApyText={showApyText}
        fontSize={fontSize}
        color={color}
      />
      {APRBreakdownModalState.isOpen ? (
        <APRBreakdownModal
          currency0={currency0}
          currency1={currency1}
          poolId={(pool as InfinityPoolInfo).poolId}
          lpApr={lpApr}
          cakeApr={cakeApr}
          tvlUSD={pool.tvlUsd}
          closeOnOverlayClick
          {...APRBreakdownModalState}
        />
      ) : null}
    </>
  )
}
