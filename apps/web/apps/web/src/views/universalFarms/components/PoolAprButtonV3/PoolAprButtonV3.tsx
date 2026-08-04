import { Protocol } from '@pancakeswap/farms'
import { useModalV2, useTooltip } from '@pancakeswap/uikit'
import { useMemo } from 'react'
import { CakeApr } from 'state/farmsV4/atom'
import {
  InfinityBinPositionDetail,
  InfinityCLPositionDetail,
  PositionDetail,
} from 'state/farmsV4/state/accountPositions/type'
import { ChainIdAddressKey, PoolInfo } from 'state/farmsV4/state/type'
import { getMerklLink } from 'utils/getMerklLink'
import { isInfinityProtocol } from 'utils/protocols'

import { sumApr } from '../../utils/sumApr'
import { InfinityPoolAprModal } from '../Modals/InfinityPoolAprModal'
import { V2PoolAprModal } from '../Modals/V2PoolAprModal'
import { V3PoolAprModal } from '../Modals/V3PoolAprModal'
import { StopPropagation } from '../StopPropagation'
import { AprButtonV3 } from './AprButtonV3'
import { AprTooltipContent, BCakeWrapperFarmAprTipContent } from './AprTooltipContent'

type PoolGlobalAprButtonProps = {
  pool: PoolInfo
  lpApr: number
  cakeApr: CakeApr[ChainIdAddressKey]
  merklApr?: number
  userPosition?: PositionDetail | InfinityBinPositionDetail | InfinityCLPositionDetail
  onAPRTextClick?: () => void
  showApyButton?: boolean
  showApyText?: boolean
  fontSize?: string
  color?: string
}

export const PoolAprButtonV3: React.FC<PoolGlobalAprButtonProps> = ({
  pool,
  lpApr,
  cakeApr,
  merklApr,
  userPosition,
  onAPRTextClick,
  showApyButton,
  showApyText,
  fontSize,
  color,
}) => {
  const baseApr = useMemo(() => {
    return sumApr(lpApr, cakeApr?.value, merklApr)
  }, [lpApr, cakeApr?.value, merklApr])
  const hasBCake = pool.protocol === 'v2' || pool.protocol === 'stable'
  const merklLink = useMemo(() => {
    return getMerklLink({ chainId: pool.chainId, lpAddress: pool.lpAddress })
  }, [pool.chainId, pool.lpAddress])

  const modal = useModalV2()

  const { tooltip, targetRef, tooltipVisible } = useTooltip(
    <AprTooltipContent
      combinedApr={baseApr}
      cakeApr={cakeApr}
      lpFeeApr={Number(lpApr) ?? 0}
      merklApr={Number(merklApr) ?? 0}
      merklLink={merklLink}
      showDesc
    >
      {hasBCake ? <BCakeWrapperFarmAprTipContent /> : null}
    </AprTooltipContent>,
  )

  return (
    <StopPropagation>
      <AprButtonV3
        hasFarm={Number(cakeApr?.value) > 0}
        ref={targetRef}
        baseApr={baseApr}
        onClick={modal.onOpen}
        onAPRTextClick={onAPRTextClick ?? modal.onOpen}
        showApyButton={showApyButton}
        showApyText={showApyText}
        fontSize={fontSize}
        color={color}
      />
      {tooltipVisible && tooltip}
      {modal.isOpen && (
        <>
          {hasBCake ? (
            <V2PoolAprModal modal={modal} poolInfo={pool} combinedApr={baseApr} lpApr={Number(lpApr ?? 0)} />
          ) : pool.protocol === Protocol.V3 ? (
            <V3PoolAprModal
              modal={modal}
              poolInfo={pool}
              cakeApr={cakeApr}
              positionDetail={userPosition as PositionDetail}
            />
          ) : isInfinityProtocol(pool.protocol) ? (
            <InfinityPoolAprModal
              modal={modal}
              poolInfo={pool}
              cakeApr={cakeApr}
              positionDetail={userPosition as InfinityCLPositionDetail}
            />
          ) : null}
        </>
      )}
    </StopPropagation>
  )
}
