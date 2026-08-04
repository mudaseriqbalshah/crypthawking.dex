import type { ExclusiveDutchOrderInfoJSON, ExclusiveDutchOrderTrade } from '@pancakeswap/pcsx-sdk'
import type { InfinityRouter, Route, RouteType } from '@pancakeswap/smart-router'
import type { Currency, CurrencyAmount, TradeType } from '@pancakeswap/swap-sdk-core'
import type { AMMOrder } from './amm'
import { Hex } from './common'
import { OrderType } from './orderType'

export type Order =
  | {
      type: OrderType.DUTCH_LIMIT
      order: {
        auctionPeriodSecs: number
        deadlineBufferSecs: number
        orderInfo: ExclusiveDutchOrderInfoJSON
        encodedOrder: Hex
        permitData: any // TODO: add permit data type
        quoteId: string
        requestId: string
        slippageTolerance: string
        startTimeBufferSecs: number
      }
    }
  | {
      type: OrderType.PCS_CLASSIC
      order: AMMOrder
    }
  | {
      type: OrderType.PCS_BRIDGE
      order: BridgeOrder
    }

export type XOrder<
  input extends Currency = Currency,
  output extends Currency = Currency,
  tradeType extends TradeType = TradeType,
> = {
  type: OrderType.DUTCH_LIMIT
  trade: ExclusiveDutchOrderTrade<input, output>
  ammTrade?: InfinityRouter.InfinityTradeWithoutGraph<tradeType>
}

export type ClassicOrder<tradeType extends TradeType = TradeType> = {
  type: OrderType.PCS_CLASSIC
  trade: InfinityRouter.InfinityTradeWithoutGraph<tradeType>
}

export type BridgeRoute = {
  path: [Currency, Currency]
  inputAmount: CurrencyAmount<Currency>
  outputAmount: CurrencyAmount<Currency>
  type: RouteType.BRIDGE
}

export interface BridgeTrade<tradeType extends TradeType = TradeType> {
  inputAmount: CurrencyAmount<Currency>
  outputAmount: CurrencyAmount<Currency>
  routes: (BridgeRoute | Route)[]
  tradeType: tradeType
  quoteQueryHash?: string
}

export type BridgeTransactionData = {
  exclusiveRelayer: string
  exclusivityDeadline: number
  fillDeadline: number
  outputAmount: string
  quoteTimestamp: number
  relayerFeePct: string
  totalRelayFee: string
}

export type BridgeOrder<tradeType extends TradeType = TradeType> = {
  type: OrderType.PCS_BRIDGE
  trade: BridgeTrade<tradeType>
  bridgeFee: CurrencyAmount<Currency>
  expectedFillTimeSec: number
  bridgeTransactionData: BridgeTransactionData
}

export type PriceOrder<
  input extends Currency = Currency,
  output extends Currency = Currency,
  tradeType extends TradeType = TradeType,
> = ClassicOrder<tradeType> | XOrder<input, output, tradeType> | BridgeOrder<tradeType>
