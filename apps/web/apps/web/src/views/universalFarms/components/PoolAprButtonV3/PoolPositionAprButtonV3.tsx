import { useModalV2 } from '@pancakeswap/uikit'
import { BIG_ZERO } from '@pancakeswap/utils/bigNumber'
import { getCurrencyAddress } from '@pancakeswap/widgets-internal'
import { useCurrencyByChainId } from 'hooks/Tokens'
import noop from 'lodash/noop'
import { useEffect } from 'react'
import {
  InfinityBinPositionDetail,
  InfinityCLPositionDetail,
  PositionDetail,
  StableLPDetail,
  V2LPDetail,
} from 'state/farmsV4/state/accountPositions/type'
import { InfinityBinPoolInfo, InfinityCLPoolInfo, InfinityPoolInfo, PoolInfo } from 'state/farmsV4/state/type'
import { useMyPositions } from 'views/PoolDetail/components/MyPositionsContext'
import {
  InfinityPositionAPR,
  useInfinityBinDerivedApr,
  useInfinityBinPositionApr,
  useInfinityCLDerivedApr,
  useInfinityCLPositionApr,
  useV2PositionApr,
  useV3FormDerivedApr,
  useV3PositionApr,
} from 'views/universalFarms/hooks/usePositionAPR'

import { APRBreakdownModal } from './AprBreakdownModal'
import { PoolAprButtonV3 } from './PoolAprButtonV3'

type PoolPositionAprButtonProps<TPosition, TPoolInfo = PoolInfo> = {
  pool: TPoolInfo
  userPosition: TPosition
  inverted?: boolean
  showApyText?: boolean
  showApyButton?: boolean
  fontSize?: string
}

export const V2PoolPositionAprButton: React.FC<PoolPositionAprButtonProps<StableLPDetail | V2LPDetail>> = ({
  pool,
  userPosition,
  fontSize,
}) => {
  const { lpApr, cakeApr, merklApr, numerator, denominator } = useV2PositionApr(pool, userPosition)
  const { updateTotalApr } = useMyPositions()

  useEffect(() => {
    if (!numerator.isZero())
      updateTotalApr(`${pool.chainId}:${pool.lpAddress}:${userPosition.isStaked}`, numerator, denominator)
  }, [denominator, numerator, pool.chainId, pool.lpAddress, updateTotalApr, userPosition.isStaked])

  return <PoolAprButtonV3 pool={pool} lpApr={lpApr} cakeApr={cakeApr} merklApr={merklApr} fontSize={fontSize} />
}

export const V3PoolPositionAprButton: React.FC<PoolPositionAprButtonProps<PositionDetail>> = ({
  pool,
  userPosition,
  fontSize,
}) => {
  const { lpApr, cakeApr, merklApr, numerator, denominator } = useV3PositionApr(pool, userPosition)
  const { updateTotalApr } = useMyPositions()

  useEffect(() => {
    if (!numerator.isZero())
      updateTotalApr(`${pool.chainId}:${pool.lpAddress}:${userPosition.tokenId}`, numerator, denominator)
  }, [denominator, numerator, pool.chainId, pool.lpAddress, updateTotalApr, userPosition.tokenId])

  return (
    <PoolAprButtonV3
      pool={pool}
      lpApr={lpApr}
      cakeApr={cakeApr}
      merklApr={merklApr}
      userPosition={userPosition}
      fontSize={fontSize}
    />
  )
}

export const InfinityCLPoolPositionAprButton: React.FC<
  PoolPositionAprButtonProps<InfinityCLPositionDetail, InfinityPoolInfo>
> = ({ pool, userPosition, fontSize }) => {
  const apr = useInfinityCLPositionApr(pool, userPosition)
  return <InfinityPoolPositionAprButton apr={apr} pool={pool} userPosition={userPosition} fontSize={fontSize} />
}

export const InfinityBinPoolPositionAprButton: React.FC<
  PoolPositionAprButtonProps<InfinityBinPositionDetail, InfinityPoolInfo>
> = ({ pool, userPosition, fontSize }) => {
  const apr = useInfinityBinPositionApr(pool, userPosition)
  return <InfinityPoolPositionAprButton apr={apr} pool={pool} userPosition={userPosition} fontSize={fontSize} />
}

type InfinityPoolPositionAprButtonProps<
  TPosition extends InfinityCLPositionDetail | InfinityBinPositionDetail = InfinityCLPositionDetail,
  TPoolInfo = PoolInfo,
> = {
  pool: TPoolInfo
  userPosition: TPosition
  apr: InfinityPositionAPR
  fontSize?: string
}

export const InfinityPoolPositionAprButton = <T extends InfinityCLPositionDetail | InfinityBinPositionDetail>({
  pool,
  userPosition,
  apr,
  fontSize,
}: InfinityPoolPositionAprButtonProps<T>) => {
  const { lpApr, cakeApr, merklApr, numerator, denominator } = apr
  const { updateTotalApr } = useMyPositions()

  useEffect(() => {
    const key = `${pool.chainId}:${pool.lpAddress}:${'tokenId' in userPosition ? userPosition.tokenId : ''}`
    if (!numerator.isZero()) updateTotalApr(key, numerator, denominator, lpApr, cakeApr)
  }, [denominator, numerator, pool.chainId, pool.lpAddress, updateTotalApr, userPosition, lpApr, cakeApr])

  useEffect(
    () => () => {
      const key = `${pool.chainId}:${pool.lpAddress}:${'tokenId' in userPosition ? userPosition.tokenId : ''}`
      updateTotalApr(key, BIG_ZERO, BIG_ZERO, '0', { value: '0' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { chainId } = userPosition
  const currency0 = useCurrencyByChainId(getCurrencyAddress(pool.token0), chainId)
  const currency1 = useCurrencyByChainId(getCurrencyAddress(pool.token1), chainId)

  const APRBreakdownModalState = useModalV2()

  return (
    <>
      <PoolAprButtonV3
        pool={pool}
        lpApr={Number(lpApr)}
        cakeApr={cakeApr}
        merklApr={merklApr}
        userPosition={userPosition}
        onAPRTextClick={APRBreakdownModalState.onOpen}
        showApyButton={false}
        fontSize={fontSize}
      />
      {APRBreakdownModalState.isOpen ? (
        <APRBreakdownModal
          currency0={currency0}
          currency1={currency1}
          poolId={(pool as InfinityPoolInfo).poolId}
          lpApr={lpApr}
          cakeApr={cakeApr}
          tvlUSD={denominator.toFixed() as `${number}`}
          {...APRBreakdownModalState}
        />
      ) : null}
    </>
  )
}

export const V3PoolDerivedAprButton: React.FC<Omit<PoolPositionAprButtonProps<PositionDetail>, 'userPosition'>> = ({
  pool,
  inverted,
  showApyText,
  showApyButton,
  fontSize,
}) => {
  const { lpApr, cakeApr, merklApr } = useV3FormDerivedApr(pool, inverted)

  return (
    <PoolAprButtonV3
      pool={pool}
      lpApr={lpApr}
      cakeApr={cakeApr}
      merklApr={merklApr}
      showApyText={showApyText}
      showApyButton={showApyButton}
      fontSize={fontSize}
    />
  )
}

export const InfinityCLPoolDerivedAprButton: React.FC<{ pool: InfinityCLPoolInfo; fontSize?: string }> = ({
  pool,
  fontSize,
}) => {
  const { lpApr, cakeApr, merklApr } = useInfinityCLDerivedApr(pool)

  return (
    <PoolAprButtonV3
      showApyButton={false}
      pool={pool}
      lpApr={lpApr}
      cakeApr={cakeApr}
      merklApr={merklApr}
      onAPRTextClick={noop}
      fontSize={fontSize}
    />
  )
}

export const InfinityBinPoolDerivedAprButton: React.FC<{ pool: InfinityBinPoolInfo; fontSize?: string }> = ({
  pool,
  fontSize,
}) => {
  const { lpApr, cakeApr, merklApr } = useInfinityBinDerivedApr(pool)

  return (
    <PoolAprButtonV3
      showApyButton={false}
      pool={pool}
      lpApr={lpApr}
      cakeApr={cakeApr}
      merklApr={merklApr}
      onAPRTextClick={noop}
      fontSize={fontSize}
    />
  )
}
