import { OrderType } from '@pancakeswap/price-api-sdk'
import { Percent } from '@pancakeswap/swap-sdk-core'
import { BridgeOrderWithCommands, isXOrder } from 'views/Swap/utils'
import { computeTradePriceBreakdown, TradePriceBreakdown } from 'views/Swap/V3Swap/utils/exchange'
import { detectHasDynamicHook } from 'views/SwapSimplify/hooks/useHasDynamicHook'

export interface BridgeOrderFee extends TradePriceBreakdown {
  type: OrderType
  hasDynamicFee?: boolean
}

export function getBridgeOrderPriceImpact(
  priceBreakdown?: BridgeOrderFee[] | TradePriceBreakdown,
): Percent | null | undefined {
  return Array.isArray(priceBreakdown)
    ? // find the highest priceImpactWithoutFee
      priceBreakdown
        .filter((p) => !p || p.type !== OrderType.PCS_BRIDGE)
        .reduce((highest, current) => {
          if (
            !highest ||
            (highest && current.priceImpactWithoutFee && current.priceImpactWithoutFee.greaterThan(highest))
          ) {
            return current.priceImpactWithoutFee
          }
          return highest
        }, priceBreakdown[0]?.priceImpactWithoutFee)
    : priceBreakdown?.priceImpactWithoutFee
}

export function computeBridgeOrderFee(order: BridgeOrderWithCommands): BridgeOrderFee | BridgeOrderFee[] {
  if (!order.noSlippageCommands) {
    return {
      priceImpactWithoutFee: undefined,
      lpFeeAmount: undefined,
      type: OrderType.PCS_BRIDGE,
    }
  }

  return order.noSlippageCommands.map((command) => {
    if (command.type === OrderType.PCS_BRIDGE) {
      return {
        // TODO: add price impact for bridge
        priceImpactWithoutFee: undefined,
        lpFeeAmount: order.bridgeFee,
        type: command.type,
      }
    }

    const o = isXOrder(command) ? command.ammTrade : command?.trade

    return {
      ...computeTradePriceBreakdown(o),
      hasDynamicFee: detectHasDynamicHook(o),
      type: command.type,
    }
  })
}
