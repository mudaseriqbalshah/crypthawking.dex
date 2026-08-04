import { ChainId } from '@pancakeswap/chains'
import { BridgeOrder, ClassicOrder, OrderType, PriceOrder, XOrder } from '@pancakeswap/price-api-sdk'
import { Currency, TradeType } from '@pancakeswap/swap-sdk-core'
import { CAKE, STABLE_COIN, USDC, USDT } from '@pancakeswap/tokens'

export const TWAP_SUPPORTED_CHAINS = [ChainId.BSC, ChainId.ARBITRUM_ONE, ChainId.BASE, ChainId.LINEA]

export const isTwapSupported = (chainId?: ChainId) => {
  return !chainId ? false : TWAP_SUPPORTED_CHAINS.includes(chainId)
}

export const isXOrder = (order: InterfaceOrder | undefined | null): order is XOrder =>
  order?.type === OrderType.DUTCH_LIMIT

export const isClassicOrder = (order: InterfaceOrder | undefined | null): order is ClassicOrder =>
  order?.type === OrderType.PCS_CLASSIC

export const isBridgeOrder = (order: InterfaceOrder | undefined | null): order is BridgeOrder =>
  order?.type === OrderType.PCS_BRIDGE

export type InterfaceOrder<
  input extends Currency = Currency,
  output extends Currency = Currency,
  tradeType extends TradeType = TradeType,
> = PriceOrder<input, output, tradeType>

// Type to support commands property
export type BridgeOrderWithCommands = BridgeOrder & {
  commands?: InterfaceOrder[]
  noSlippageCommands?: InterfaceOrder[]
}

export function getDefaultToken(chainId: number): string | undefined {
  return CAKE[chainId]?.address ?? STABLE_COIN[chainId]?.address ?? USDC[chainId]?.address ?? USDT[chainId]?.address
}
