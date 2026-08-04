import { ExclusiveDutchOrderTrade } from '@pancakeswap/pcsx-sdk'
import { BridgeTrade, BridgeTransactionData, OrderType } from '@pancakeswap/price-api-sdk'
import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk'
import { InfinityTradeWithoutGraph } from '@pancakeswap/smart-router/dist/evm/infinity-router'
import { BRIDGE_API_ENDPOINT } from 'config/constants/endpoints'
import { chainIdToExplorerInfoChainName } from 'state/info/api/client'
import { Address } from 'viem/accounts'
import { BridgeOrderWithCommands } from '../utils'
import {
  BridgeDataSchema,
  BridgeStatusResponse,
  CalldataRequestSchema,
  Command,
  GetBridgeCalldataResponse,
  Permit2Schema,
  SwapDataSchema,
  UserBridgeOrdersResponse,
} from './types'

// // Define the schema for the "SWAP" command data
// export const SwapDataSchema = Type.Object({
//   originChainId: Type.Number(),
//   trade: TradeSchema,
//   slippageTolerance: Type.Number(),
//   deadlineOrPreviousBlockhash: Type.Optional(Type.String()),
//   recipient: Type.Optional(addressModel),
// });

export function getTokenAddress(currency: Currency): Address {
  return currency.isNative ? '0x0000000000000000000000000000000000000000' : currency.wrapped.address
}

export function generateBridgeCommands({
  trade,
  recipient,
  bridgeTransactionData,
}: {
  trade: BridgeTrade<TradeType>
  recipient: Address
  bridgeTransactionData: BridgeTransactionData
}): BridgeDataSchema {
  return {
    command: Command.BRIDGE,
    data: {
      inputToken: getTokenAddress(trade.inputAmount.currency),
      outputToken: getTokenAddress(trade.outputAmount.currency),

      inputAmount: trade.inputAmount.quotient.toString(),
      originChainId: trade.inputAmount.currency.chainId,
      destinationChainId: trade.outputAmount.currency.chainId,
      originChainRecipient: recipient,
      minOutputAmount: trade.outputAmount.quotient.toString(),
      bridgeTransactionData,
    },
  }
}

export function generateSwapCommands({
  trade,
  allowedSlippage,
}: {
  trade: InfinityTradeWithoutGraph<TradeType> | ExclusiveDutchOrderTrade<Currency, Currency>
  allowedSlippage: number
}): SwapDataSchema {
  return {
    command: Command.SWAP,
    data: {
      originChainId: trade.inputAmount.currency.chainId,
      trade: JSON.parse(JSON.stringify(trade, replacer, 2)),
      slippageTolerance: allowedSlippage,
    },
  }
}

const replacer = (_, value: string | bigint) => {
  return typeof value === 'bigint' ? value.toString() : value
}

export const getBridgeCalldata = async ({
  order,
  recipient,
  permit2,
  allowedSlippage,
}: {
  order: BridgeOrderWithCommands
  recipient: Address
  permit2?: Permit2Schema
  allowedSlippage: number
}) => {
  try {
    if (!Array.isArray(order?.commands)) {
      throw new Error('No bridge commands found')
    }

    const commands: (BridgeDataSchema | SwapDataSchema)[] = order.commands.map((command) => {
      if (command.type === OrderType.PCS_BRIDGE) {
        return generateBridgeCommands({
          trade: command.trade,
          recipient,
          bridgeTransactionData: command.bridgeTransactionData,
        })
      }

      return generateSwapCommands({
        trade: command.trade,
        allowedSlippage,
      })
    })

    const calldataRequest: CalldataRequestSchema = {
      inputToken: getTokenAddress(order.trade.inputAmount.currency),
      outputToken: getTokenAddress(order.trade.outputAmount.currency),
      inputAmount: order.trade.inputAmount.quotient.toString(),
      originChainId: order.trade.inputAmount.currency.chainId,
      destinationChainId: order.trade.outputAmount.currency.chainId,
      recipientOnDestChain: recipient,
      commands,
      permit2,
    }

    const resp = await fetch(`${BRIDGE_API_ENDPOINT}/v1/calldata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calldataRequest),
    })

    const data = (await resp.json()) as GetBridgeCalldataResponse
    return data
  } catch (error) {
    console.error('getBridgeCalldata Error', error)
    throw error
  }
}

export type Permit2ResponseSchema = {
  amount: string
  expiration: number
  nonce: number
}

export type PostBridgeCheckApprovalResponse = {
  isApprovalRequired: boolean
  isPermit2Required: boolean
  permit2Address: Address
  spender: Address
  permit2Details?: Permit2ResponseSchema
  tokenAddress?: `0x${string}`
  walletAddress?: `0x${string}`
  data?: `0x${string}`

  error?: {
    code: string
    message: string
  }
}

export const postBridgeCheckApproval = async ({
  currencyAmountIn,
  recipient,
}: {
  currencyAmountIn: CurrencyAmount<Currency>
  recipient: Address
}) => {
  try {
    const resp = await fetch(`${BRIDGE_API_ENDPOINT}/v1/check-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: recipient,
        tokenAddress: getTokenAddress(currencyAmountIn.currency),
        amount: currencyAmountIn.quotient.toString(),
        chainId: currencyAmountIn.currency.chainId,
      }),
    })

    const data = (await resp.json()) as PostBridgeCheckApprovalResponse
    return data
  } catch (error) {
    console.error('postBridgeCheckApproval Error', error)
    throw error
  }
}

export interface Route {
  originChainId: number
  destinationChainId: number
  originToken: string
  destinationToken: string
  destinationTokenSymbol: string
}

export type GetAvailableRoutesParams = {
  originChainId?: number
  destinationChainId?: number
  originToken?: string
  destinationToken?: string
}

export const getBridgeAvailableRoutes = async (params: GetAvailableRoutesParams) => {
  const stringParams = Object.fromEntries(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, value?.toString()]),
  )
  const resp = await fetch(`${BRIDGE_API_ENDPOINT}/v1/routes?${new URLSearchParams(stringParams).toString()}`)
  const data = (await resp.json()) as { routes: Route[] }
  return data?.routes
}

export type Metadata = {
  // Define the metadata structure based on backend response
  routes?: Route[]
  quote?: {
    outputAmount: string
    minOutputAmount: string
    gasFee?: string
  }
  // Add additional fields as needed
}

export type GetMetadataParams = {
  inputToken: Address
  originChainId: number | string
  outputToken: Address
  destinationChainId: number | string
  amount: string
  commands?: (BridgeDataSchema | SwapDataSchema)[]
  recipientOnDestChain?: string
}

export interface MetadataResponse {
  supported: boolean
  error?: {
    code: string
    message: string
    description?: string
  }
  reason?: string
}

export interface MetadataSuccessResponse extends MetadataResponse {
  amount: string
  inputToken: string
  originChainId: number
  outputToken: string
  destinationChainId: number
  expectedFillTimeSec: string
  isAmountTooLow: boolean
  limits: {
    minDeposit: string
    maxDeposit: string
    maxDepositInstant: string
    maxDepositShortDelay: string
    recommendedDepositInstant: string
  }
  bridgeTransactionData: BridgeTransactionData
}

export const postMetadata = async (params: GetMetadataParams): Promise<MetadataSuccessResponse> => {
  const { commands, recipientOnDestChain, ...rest } = params

  const stringParams = Object.fromEntries(
    Object.entries(rest)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, value?.toString()]),
  )

  const resp = await fetch(`${BRIDGE_API_ENDPOINT}/v1/metadata?${new URLSearchParams(stringParams).toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientOnDestChain,
      commands,
    }),
  })

  return resp.json()
}

export const getBridgeStatus = async (chainId: number, txHash: string): Promise<BridgeStatusResponse> => {
  const resp = await fetch(
    `${BRIDGE_API_ENDPOINT}/v1/status/${chainIdToExplorerInfoChainName[chainId]}?txHash=${txHash}`,
  )
  return resp.json()
}

export const getUserBridgeOrders = async (
  address: Address,
  afterCursor?: string,
): Promise<UserBridgeOrdersResponse> => {
  const resp = await fetch(`${BRIDGE_API_ENDPOINT}/v1/orders/${address}${afterCursor ? `?after=${afterCursor}` : ''}`)
  return resp.json()
}
