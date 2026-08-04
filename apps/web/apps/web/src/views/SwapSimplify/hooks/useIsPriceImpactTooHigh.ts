import { useActiveChainId } from 'hooks/useActiveChainId'
import { useMemo, useRef } from 'react'
import { warningSeverity } from 'utils/exchange'
import { InterfaceOrder, isBridgeOrder, isXOrder } from 'views/Swap/utils'

import { computeBridgeOrderFee } from 'views/Swap/Bridge/utils'
import { computeTradePriceBreakdown, findHighestPriceImpact } from '../../Swap/V3Swap/utils/exchange'

export const useIsPriceImpactTooHigh = (bestOrder: InterfaceOrder | undefined, isLoading?: boolean) => {
  const { chainId } = useActiveChainId()
  const chainIdRef = useRef(chainId)

  const priceBreakdown = useMemo(
    () =>
      isBridgeOrder(bestOrder)
        ? computeBridgeOrderFee(bestOrder)
        : computeTradePriceBreakdown(isXOrder(bestOrder) ? bestOrder?.ammTrade : bestOrder?.trade),
    [bestOrder],
  )
  return useMemo(() => {
    let priceImpactWithoutFee

    if (Array.isArray(priceBreakdown)) {
      priceImpactWithoutFee = findHighestPriceImpact(priceBreakdown)
    } else {
      priceImpactWithoutFee = priceBreakdown.priceImpactWithoutFee
    }

    const warningLevel = warningSeverity(priceImpactWithoutFee)
    if (chainIdRef?.current === chainId) {
      if (!isLoading) return warningLevel >= 3
      return false
    }
    chainIdRef.current = chainId
    return false
  }, [priceBreakdown, chainId, isLoading])
}
