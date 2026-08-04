import { BridgeTransactionData, PriceOrder } from '@pancakeswap/price-api-sdk'
import { Currency, CurrencyAmount } from '@pancakeswap/swap-sdk-core'
import { Address } from 'viem/accounts'
import { CrossChainAPIErrorCode } from '../CrossChainConfirmSwapModal/hooks/useBridgeErrorMessages'

export type GetBridgeCalldataResponse = {
  transactionData: {
    router: Address
    calldata: `0x${string}`
  }
  gasFee: string
}

export enum Command {
  BRIDGE = 'BRIDGE',
  SWAP = 'SWAP',
}

export interface BridgeDataSchema {
  command: Command.BRIDGE
  data: {
    inputToken: Address
    outputToken: Address
    inputAmount: string
    minOutputAmount?: string
    originChainId: number
    destinationChainId: number
    originChainRecipient: Address
    destinationChainRecipient?: Address
    bridgeTransactionData?: BridgeTransactionData
  }
}

export interface SwapDataSchema {
  command: Command.SWAP
  data: {
    originChainId: number
    trade: any
    slippageTolerance: number
    deadlineOrPreviousBlockhash?: string
    recipient?: Address
  }
}

export interface Permit2Schema {
  details?: {
    token: string
    amount: string
    expiration: number
    nonce: number
  }
  spender?: string
  sigDeadline?: string
  signature?: string
}

export interface CalldataRequestSchema {
  inputToken: Address
  outputToken: Address
  inputAmount: string
  originChainId: number
  destinationChainId: number
  recipientOnDestChain: Address
  commands: (BridgeDataSchema | SwapDataSchema)[]
  permit2?: Permit2Schema
}

export enum BridgeStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  PENDING = 'PENDING', // when a transaction is not yet indexed
  BRIDGE_PENDING = 'BRIDGE_PENDING', // when bridging is pending
  FAILED = 'FAILED',
}

export interface BridgeStatusResponse {
  status: BridgeStatus
  data?: BridgeResponseStatusData[]
  inputToken?: string
  outputToken?: string
  inputAmount?: string
  outputAmount?: string
  originChainId?: number
  destinationChainId?: number
  minOutputAmount?: string
  orderId?: string
  transactionId?: string
}

export type BridgeResponseStatusData =
  | {
      command: Command.BRIDGE
      status: {
        code: BridgeStatus
        errorCode?: CrossChainAPIErrorCode
      }
      metadata?: StatusMetadataBridge
    }
  | {
      command: Command.SWAP
      status: {
        code: BridgeStatus
        errorCode?: CrossChainAPIErrorCode
      }
      metadata?: StatusMetadataSwap
    }

interface StatusMetadataBridge {
  originChainId: number
  destinationChainId: number
  depositId: number
  bridgeStatus: string
  fillTx: string
  depositTxHash: string
  depositRefundTxHash: string
  inputAmount: string
  outputAmount: string
  fee: string
  inputToken: Address
  outputToken: Address
}

export interface StatusMetadataSwap {
  chainId: number
  inputToken: Address
  outputToken: Address
  inputAmount: string
  outputAmount: string
  tx: string
  fee: string
}

export interface BridgeStatusData extends BridgeStatusResponse {
  inputCurrencyAmount?: CurrencyAmount<Currency> | null
  outputCurrencyAmount?: CurrencyAmount<Currency> | null
  feesBreakdown?: {
    totalFeesUSD: number
    // in case of having swap in the bridge order, swapFeesUSD is null if swap fee is not loaded yet or returned as 0
    swapFeesUSD: number | null
    bridgeFeesUSD: number
  }
}

export interface ActiveBridgeOrderMetadata {
  originChainId: number
  txHash: string

  order: PriceOrder | null | undefined

  // Optional metadata to show in modals quickly
  metadata?: {
    status: BridgeStatus
    inputToken: string
    outputToken: string
    inputAmount: string
    outputAmount: string
    minOutputAmount: string
    originChainId: number
    destinationChainId: number
  }
}

export interface UserBridgeOrdersResponse {
  startCursor: string
  endCursor: string
  hasNextPage: boolean
  rows: UserBridgeOrder[]
}

export interface UserBridgeOrder {
  status: BridgeStatus
  inputToken: string
  outputToken: string
  inputAmount: string
  outputAmount: string
  minOutputAmount: string
  originChainId: number
  destinationChainId: number
  orderId: string
  transactionHash: string
  fillTransactionHash: string
  command: string
  timestamp: string
}

export type BridgeMetadataParams = {
  inputAmount: CurrencyAmount<Currency>
  outputCurrency: Currency
  nonce?: number
  commands?: (BridgeDataSchema | SwapDataSchema)[]
  recipientOnDestChain?: string
}
