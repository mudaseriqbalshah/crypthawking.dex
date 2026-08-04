import { FlexGap, Skeleton, Text, TooltipText } from '@pancakeswap/uikit'
import { displayApr } from '@pancakeswap/utils/displayApr'
import { FarmWidget } from '@pancakeswap/widgets-internal'
import { forwardRef, MouseEvent, useCallback, useMemo } from 'react'

type ApyButtonProps = {
  showApyButton?: boolean
  loading?: boolean
  onClick?: () => void
  hasFarm?: boolean
  onAPRTextClick?: () => void
  baseApr?: number
}

export const AprButton = forwardRef<HTMLElement, ApyButtonProps>(
  ({ showApyButton = true, loading, onClick, onAPRTextClick, baseApr, hasFarm }, ref) => {
    const handleClick = useCallback(
      (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (onClick) {
          onClick()
        }
      },
      [onClick],
    )

    if (loading) {
      return <Skeleton height={24} width={80} style={{ borderRadius: '12px' }} />
    }

    return (
      <FlexGap alignItems="center">
        {showApyButton && <FarmWidget.FarmApyButton variant="text-and-button" handleClickButton={handleClick} />}
        <AprButtonText hasFarm={hasFarm} baseApr={baseApr} ref={ref} onClick={onAPRTextClick} />
      </FlexGap>
    )
  },
)

type AprButtonTextProps = Pick<ApyButtonProps, 'baseApr' | 'hasFarm'> & {
  onClick?: () => void
}

const AprButtonText = forwardRef<HTMLElement, AprButtonTextProps>(({ baseApr, hasFarm, onClick }, ref) => {
  const isZeroApr = baseApr === 0

  const ZeroApr = useMemo(
    () => (
      <TooltipText ml="4px" fontSize="16px" color="destructive" bold>
        0%
      </TooltipText>
    ),
    [],
  )

  const commonApr = useMemo(
    () => (
      <FlexGap>
        {hasFarm ? (
          <Text fontSize="16px" color="v2Primary50" bold>
            🌿
          </Text>
        ) : null}
        <TooltipText ml="4px" fontSize="16px" color="text">
          {baseApr ? displayApr(baseApr) : null}
        </TooltipText>
      </FlexGap>
    ),
    [baseApr, hasFarm],
  )

  if (typeof baseApr === 'undefined') {
    return null
  }
  return (
    <span ref={ref} onClick={onClick} aria-hidden>
      {isZeroApr ? ZeroApr : commonApr}
    </span>
  )
})
