import { usePreviousValue } from '@pancakeswap/hooks'
import { useTranslation } from '@pancakeswap/localization'
import { getPermit2Address } from '@pancakeswap/permit2-sdk'
import { PriceOrder } from '@pancakeswap/price-api-sdk'
import { Currency, CurrencyAmount, Percent, Token } from '@pancakeswap/swap-sdk-core'
import { useToast } from '@pancakeswap/uikit'
import { Permit2Signature } from '@pancakeswap/universal-router-sdk'
import { ConfirmModalState, useAsyncConfirmPriceImpactWithoutFee } from '@pancakeswap/widgets-internal'
import { ToastDescriptionWithTx } from 'components/Toast'
import { BLOCK_CONFIRMATION } from 'config/confirmation'
import { ALLOWED_PRICE_IMPACT_HIGH, PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN } from 'config/constants/exchange'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { useEIP5792Status } from 'hooks/useIsEIP5792Supported'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { useNativeWrap } from 'hooks/useNativeWrap'
import { Calldata, usePermit2 } from 'hooks/usePermit2'
import { usePermit2Requires } from 'hooks/usePermit2Requires'
import { useSafeTxHashTransformer } from 'hooks/useSafeTxHashTransformer'
import { useTransactionDeadline } from 'hooks/useTransactionDeadline'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RetryableError, retry } from 'state/multicall/retry'
import { useCurrencyBalance } from 'state/wallet/hooks'
import { logGTMSwapTxSentEvent } from 'utils/customGTMEventTracking'
import { UserUnexpectedTxError } from 'utils/errors'
import { logSwap } from 'utils/log'
import { publicClient } from 'utils/wagmi'
import {
  Address,
  Hex,
  TransactionNotFoundError,
  TransactionReceipt,
  TransactionReceiptNotFoundError,
  createWalletClient,
  custom,
  erc20Abi,
} from 'viem'
import { eip5792Actions } from 'viem/experimental'
import { useWalletType } from 'views/Mev/hooks'
import { WalletType } from 'views/Mev/types'
import { BridgeOrderWithCommands, isBridgeOrder, isClassicOrder, isXOrder } from 'views/Swap/utils'
import { waitForXOrderReceipt } from 'views/Swap/x/api'
import { useSendXOrder } from 'views/Swap/x/useSendXOrder'
import { useAccount, useSendTransaction, useWalletClient } from 'wagmi'

import { useSetAtom } from 'jotai'
import { calculateGasMargin } from 'utils'
import { viemClients } from 'utils/viem'
import { getBridgeCalldata } from 'views/Swap/Bridge/api'
import { useBridgeCheckApproval } from 'views/Swap/Bridge/hooks'

import { ChainId } from '@pancakeswap/chains'
import { useUserSlippage } from '@pancakeswap/utils/user'
import { useSwapState } from 'state/swap/hooks'
import { activeBridgeOrderMetadataAtom } from 'views/Swap/Bridge/CrossChainConfirmSwapModal/state/orderDataState'
import { Permit2Schema } from 'views/Swap/Bridge/types'
import { computeBridgeOrderFee, getBridgeOrderPriceImpact } from 'views/Swap/Bridge/utils'
import { computeTradePriceBreakdown } from '../utils/exchange'
import { BatchCall, getBatchedTransaction as getBatchedTransactionHelper } from './batchHelper'
import { eip5792UserRejectUpgradeError, userRejectedError } from './useSendSwapTransaction'
import { useSwapCallback } from './useSwapCallback'

export interface ConfirmAction {
  step: ConfirmModalState
  action: (nextStep?: ConfirmModalState) => Promise<void>
  showIndicator: boolean
  getCalldata?: <T = Calldata>() => T
}

const getTokenAllowance = ({
  chainId,
  address,
  inputs,
}: {
  chainId: number
  address: Address
  inputs: [`0x${string}`, `0x${string}`]
}) => {
  const client = publicClient({ chainId })

  return client.readContract({
    abi: erc20Abi,
    address,
    functionName: 'allowance',
    args: inputs,
  })
}

const useCreateConfirmSteps = (
  order: PriceOrder | undefined,
  amountToApprove: CurrencyAmount<Token> | undefined,
  spender: Address | undefined,
) => {
  const { requireApprove, requirePermit, requireRevoke } = usePermit2Requires(amountToApprove, spender)
  const nativeCurrency = useNativeCurrency(order?.trade?.inputAmount.currency.chainId)
  const { address: account } = useAccount()
  const balance = useCurrencyBalance(account ?? undefined, nativeCurrency.wrapped)

  const { requiresApproval, approvalData } = useBridgeCheckApproval(order)

  return useCallback(async () => {
    const steps: ConfirmModalState[] = []
    if (
      isXOrder(order) &&
      order.trade.inputAmount.currency.isNative &&
      amountToApprove &&
      (!balance || balance.lessThan(amountToApprove))
    ) {
      steps.push(ConfirmModalState.WRAPPING)
    }
    if (requireRevoke) {
      steps.push(ConfirmModalState.RESETTING_APPROVAL)
    }

    // Handle bridge order approval check
    if (isBridgeOrder(order)) {
      if (requiresApproval) steps.push(ConfirmModalState.APPROVING_TOKEN)
      if (approvalData?.isPermit2Required) steps.push(ConfirmModalState.PERMITTING)
    } else if (requireApprove) {
      steps.push(ConfirmModalState.APPROVING_TOKEN)
    }

    if (isClassicOrder(order) && requirePermit) {
      steps.push(ConfirmModalState.PERMITTING)
    }
    steps.push(ConfirmModalState.PENDING_CONFIRMATION)
    return steps
  }, [
    requireRevoke,
    requireApprove,
    requirePermit,
    order,
    balance,
    amountToApprove,
    requiresApproval,
    approvalData?.isPermit2Required,
  ])
}

// define the actions of each step
const useConfirmActions = (
  order: PriceOrder | undefined,
  amountToApprove: CurrencyAmount<Token> | undefined,
  spender: Address | undefined,
) => {
  const { t } = useTranslation()
  const { chainId } = useActiveChainId()
  const [deadline] = useTransactionDeadline()
  const safeTxHashTransformer = useSafeTxHashTransformer()
  const { revoke, permit, approve, getPermitCalldata, getApproveCalldata } = usePermit2(amountToApprove, spender, {
    enablePaymaster: true,
  })
  const nativeWrap = useNativeWrap()
  const { address: account } = useAccount()
  const getAllowanceArgs = useMemo(() => {
    if (!chainId) return undefined
    const inputs = [account, getPermit2Address(chainId)] as [`0x${string}`, `0x${string}`]
    return {
      chainId,
      address: amountToApprove?.currency.address as Address,
      inputs,
    }
  }, [chainId, amountToApprove?.currency.address, account])
  const [permit2Signature, setPermit2Signature] = useState<Permit2Signature | undefined>(undefined)
  const {
    callback: swap,
    error: swapError,
    swapCalls,
  } = useSwapCallback({
    trade: isClassicOrder(order) ? order.trade : undefined,
    deadline,
    permitSignature: permit2Signature,
  })
  const nativeCurrency = useNativeCurrency(order?.trade?.inputAmount.currency.chainId)
  const wrappedBalance = useCurrencyBalance(account ?? undefined, nativeCurrency.wrapped)

  const { mutateAsync: sendXOrder } = useSendXOrder()

  const { sendTransactionAsync } = useSendTransaction()

  const [confirmState, setConfirmState] = useState<ConfirmModalState>(ConfirmModalState.REVIEWING)
  const [txHash, setTxHash] = useState<Hex | undefined>(undefined)
  const [orderHash, setOrderHash] = useState<Hex | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const setActiveBridgeOrderMetadata = useSetAtom(activeBridgeOrderMetadataAtom)

  const { toastSuccess, toastError, toastInfo } = useToast()

  const resetState = useCallback(() => {
    setConfirmState(ConfirmModalState.REVIEWING)
    setTxHash(undefined)
    setErrorMessage(undefined)
    setPermit2Signature(undefined)
  }, [])

  const showError = useCallback((error: string) => {
    setErrorMessage(error)
    setTxHash(undefined)
    setPermit2Signature(undefined)
  }, [])

  const retryWaitForTransaction = useCallback(
    async ({ hash, confirmations }: { hash?: Hex; confirmations?: number }) => {
      if (hash && chainId) {
        const getReceipt = async () => {
          try {
            return await publicClient({ chainId }).waitForTransactionReceipt({
              hash,
              confirmations,
            })
          } catch (error) {
            if (error instanceof TransactionReceiptNotFoundError || error instanceof TransactionNotFoundError) {
              throw new RetryableError()
            }
            throw error
          }
        }
        const { promise } = retry<TransactionReceipt>(getReceipt, {
          n: 6,
          minWait: 2000,
          maxWait: confirmations ? confirmations * 5000 : 5000,
        })
        return promise
      }
      return undefined
    },
    [chainId],
  )

  // define the action of each step
  const revokeStep = useMemo(() => {
    const action = async (nextState?: ConfirmModalState) => {
      setTxHash(undefined)
      setConfirmState(ConfirmModalState.RESETTING_APPROVAL)
      try {
        const result = await revoke()
        if (result?.hash) {
          const hash = await safeTxHashTransformer(result.hash)
          setTxHash(hash)

          await retryWaitForTransaction({ hash })
        }

        let newAllowanceRaw: bigint = 0n

        try {
          // check if user really reset the approval to 0
          // const { data } = await refetch()
          if (getAllowanceArgs) {
            const data = await getTokenAllowance(getAllowanceArgs)
            newAllowanceRaw = data ?? 0n
          }
        } catch (error) {
          // assume the approval reset is successful, if we can't check the allowance
          console.error('check allowance after revoke failed: ', error)
        }

        const newAllowance = CurrencyAmount.fromRawAmount(amountToApprove?.currency as Currency, newAllowanceRaw ?? 0n)
        if (!newAllowance.equalTo(0)) {
          throw new UserUnexpectedTxError({
            expectedData: 0,
            actualData: newAllowanceRaw.toString(),
          })
        }

        setConfirmState(nextState ?? ConfirmModalState.APPROVING_TOKEN)
      } catch (error) {
        console.error('revoke error', error)
        if (userRejectedError(error)) {
          showError(t('Transaction rejected'))
        } else if (error instanceof UserUnexpectedTxError) {
          showError(t('Revoke transaction filled, but Approval not reset to 0. Please try again.'))
        } else {
          showError(typeof error === 'string' ? error : (error as any)?.message)
        }
      }
    }
    return {
      step: ConfirmModalState.RESETTING_APPROVAL,
      action,
      showIndicator: true,
    }
  }, [
    amountToApprove?.currency,
    getAllowanceArgs,
    retryWaitForTransaction,
    revoke,
    safeTxHashTransformer,
    showError,
    t,
  ])

  const { approvalData, error, refetch, signPermit2 } = useBridgeCheckApproval(order)

  const permitStep = useMemo(() => {
    return {
      step: ConfirmModalState.PERMITTING,
      action: async (nextState?: ConfirmModalState) => {
        setConfirmState(ConfirmModalState.PERMITTING)
        try {
          if (isBridgeOrder(order)) {
            const permitSignatureResponse = await signPermit2()

            setPermit2Signature(permitSignatureResponse)
          } else {
            const { tx, ...result } = (await permit()) ?? {}
            if (tx) {
              const hash = await safeTxHashTransformer(tx)
              retryWaitForTransaction({ hash })
              // use transferAllowance, no need to use permit signature
              setPermit2Signature(undefined)
            } else {
              setPermit2Signature(result)
            }
          }

          setConfirmState(nextState ?? ConfirmModalState.PENDING_CONFIRMATION)
        } catch (error) {
          if (userRejectedError(error)) {
            showError('Transaction rejected')
          } else {
            showError(typeof error === 'string' ? error : (error as any)?.message)
          }
        }
      },
      showIndicator: true,
      getCalldata: getPermitCalldata,
    }
  }, [
    permit,
    retryWaitForTransaction,
    safeTxHashTransformer,
    showError,
    signPermit2,
    setPermit2Signature,
    order,
    getPermitCalldata,
  ])

  const wrapStep = useMemo(() => {
    return {
      step: ConfirmModalState.WRAPPING,
      action: async (nextState?: ConfirmModalState) => {
        try {
          setConfirmState(ConfirmModalState.WRAPPING)
          const wrapAmount = BigInt(amountToApprove?.quotient ?? 0)
          const result = await nativeWrap(wrapAmount - (wrappedBalance?.quotient ?? 0n))
          if (result && result.hash) {
            const chain = amountToApprove?.currency.chainId
            await retryWaitForTransaction({
              hash: txHash,
              confirmations: chain ? BLOCK_CONFIRMATION[chain] : undefined,
            })
          }
          if (nextState) {
            setConfirmState(nextState)
          }
        } catch (error) {
          console.error('wrap error', error)
          if (userRejectedError(error)) {
            showError('Transaction rejected')
          } else {
            showError(typeof error === 'string' ? error : (error as any)?.message)
          }
        }
      },
      showIndicator: true,
    }
  }, [amountToApprove, nativeWrap, retryWaitForTransaction, showError, txHash, wrappedBalance?.quotient])

  const approveStep = useMemo(() => {
    return {
      step: ConfirmModalState.APPROVING_TOKEN,
      action: async (nextState?: ConfirmModalState) => {
        setTxHash(undefined)
        setConfirmState(ConfirmModalState.APPROVING_TOKEN)
        try {
          const result = await approve()
          if (result?.hash && chainId) {
            const hash = await safeTxHashTransformer(result.hash)
            setTxHash(hash)
            await retryWaitForTransaction({ hash })
          }
          let newAllowanceRaw: bigint = amountToApprove?.quotient ?? 0n
          // check if user really approved the amount trade needs
          try {
            if (getAllowanceArgs) {
              const data = await getTokenAllowance(getAllowanceArgs)
              newAllowanceRaw = data ?? 0n
            }
          } catch (error) {
            // assume the approval is successful, if we can't check the allowance
            console.error('check allowance after approve failed: ', error)
          }
          const newAllowance = CurrencyAmount.fromRawAmount(
            amountToApprove?.currency as Currency,
            newAllowanceRaw ?? 0n,
          )
          if (amountToApprove && newAllowance && newAllowance.lessThan(amountToApprove)) {
            throw new UserUnexpectedTxError({
              expectedData: amountToApprove.quotient.toString(),
              actualData: newAllowanceRaw.toString(),
            })
          }

          setConfirmState(nextState ?? ConfirmModalState.PERMITTING)
        } catch (error) {
          console.error('approve error', error)
          if (userRejectedError(error)) {
            showError(t('Transaction rejected'))
          } else if (error instanceof UserUnexpectedTxError) {
            showError(
              t('Approve transaction filled, but Approval still not enough to fill current trade. Please try again.'),
            )
          } else {
            showError(typeof error === 'string' ? error : (error as any)?.message)
          }
        }
      },
      showIndicator: true,
      getCalldata: getApproveCalldata,
    }
  }, [
    getApproveCalldata,
    amountToApprove,
    approve,
    chainId,
    getAllowanceArgs,
    retryWaitForTransaction,
    safeTxHashTransformer,
    showError,
    t,
  ])

  const approvalBridgeStep = useMemo(() => {
    return {
      step: ConfirmModalState.APPROVING_TOKEN,
      action: async (nextStep?: ConfirmModalState) => {
        if (!order) {
          return
        }

        setTxHash(undefined)
        setConfirmState(ConfirmModalState.APPROVING_TOKEN)

        try {
          if (error?.code) {
            throw new Error(`Approval check failed: ${error.message || error?.code}`)
          }

          if (typeof approvalData?.isApprovalRequired !== 'boolean') {
            throw new Error('Approval check response is failed!')
          }

          // we use approvalData?.approval?.isRequired instead of requiresApproval from the hook
          // because we want to ensure the accuracy of the approval check response
          if (approvalData?.isApprovalRequired) {
            const { tokenAddress, data } = approvalData

            // NOTE: data will be approve(permit2Address, amount)
            const result = await sendTransactionAsync({
              to: tokenAddress,
              data,
            })

            if (result) {
              const hash = await safeTxHashTransformer(result)
              setTxHash(hash)
              await retryWaitForTransaction({ hash })
            }

            setConfirmState(nextStep ?? ConfirmModalState.PENDING_CONFIRMATION)
          } else {
            // If no approval needed, move to next step
            setConfirmState(nextStep ?? ConfirmModalState.PENDING_CONFIRMATION)
          }
        } catch (error) {
          if (userRejectedError(error)) {
            showError(t('Transaction rejected'))
          } else {
            showError(typeof error === 'string' ? error : (error as any)?.message)
          }
        } finally {
          refetch()
        }
      },
      showIndicator: true,
    }
  }, [
    approvalData,
    account,
    order,
    retryWaitForTransaction,
    safeTxHashTransformer,
    sendTransactionAsync,
    showError,
    t,
    error?.code,
    error?.message,
  ])

  const { recipient: recipientAddress } = useSwapState()
  const recipient = recipientAddress === null ? account : recipientAddress

  const [allowedSlippage] = useUserSlippage() // custom from users

  const swapBridgeStep = useMemo(() => {
    return {
      step: ConfirmModalState.PENDING_CONFIRMATION,
      action: async () => {
        // TODO: show error message???
        if (!order || !recipient) {
          return
        }

        setTxHash(undefined)
        setConfirmState(ConfirmModalState.PENDING_CONFIRMATION)

        try {
          const bridgeCalldataResponse = await getBridgeCalldata({
            order: order as BridgeOrderWithCommands,
            recipient: recipient as Address,
            permit2: permit2Signature as Permit2Schema | undefined,
            allowedSlippage,
          })

          if (bridgeCalldataResponse?.transactionData?.calldata) {
            const publicClient = viemClients[chainId as ChainId]

            const result = await publicClient
              ?.estimateGas({
                account,
                to: bridgeCalldataResponse.transactionData.router,
                data: bridgeCalldataResponse.transactionData.calldata,
                value: order.trade.inputAmount.currency.isNative
                  ? BigInt(order.trade.inputAmount.quotient.toString())
                  : undefined,
              })
              .then((gasLimit) => {
                return sendTransactionAsync({
                  to: bridgeCalldataResponse.transactionData.router,
                  data: bridgeCalldataResponse.transactionData.calldata,
                  value: order.trade.inputAmount.currency.isNative
                    ? BigInt(order.trade.inputAmount.quotient.toString())
                    : undefined,
                  gas: calculateGasMargin(gasLimit),
                })
              })

            if (result) {
              const hash = await safeTxHashTransformer(result)
              setTxHash(hash)

              setConfirmState(ConfirmModalState.ORDER_SUBMITTED)

              // Set the active bridge order metadata,
              // used for tracking order from Status API
              setActiveBridgeOrderMetadata({
                order,
                txHash: hash,
                originChainId: order.trade.inputAmount.currency.chainId,
              })

              await retryWaitForTransaction({
                hash,
                confirmations: order.trade.inputAmount.currency.chainId
                  ? BLOCK_CONFIRMATION[order.trade.inputAmount.currency.chainId]
                  : undefined,
              })

              toastSuccess(
                t('Success!'),
                <ToastDescriptionWithTx txHash={hash} txChainId={order.trade.inputAmount.currency.chainId}>
                  {t('Bridge transaction submitted')}
                </ToastDescriptionWithTx>,
              )
            }
          } else {
            showError(t('Failed to generate bridge transaction'))
          }
        } catch (error) {
          console.error('bridge transaction error', error)
          if (userRejectedError(error)) {
            showError(t('Transaction rejected'))
          } else {
            showError(t('Failed to generate bridge transaction. Please adjust the slippage and try again.'))
          }
        }
      },
      showIndicator: true,
    }
  }, [
    account,
    order,
    retryWaitForTransaction,
    safeTxHashTransformer,
    sendTransactionAsync,
    showError,
    t,
    toastSuccess,
    recipient,
    chainId,
    setActiveBridgeOrderMetadata,
    permit2Signature,
    allowedSlippage,
  ])

  const swapStep = useMemo(() => {
    return {
      step: ConfirmModalState.PENDING_CONFIRMATION,
      action: async () => {
        setTxHash(undefined)
        setConfirmState(ConfirmModalState.PENDING_CONFIRMATION)

        if (!swap) {
          resetState()
          return
        }

        if (swapError) {
          showError(swapError)
          return
        }

        try {
          const result = await swap()
          if (result?.hash) {
            const hash = await safeTxHashTransformer(result.hash)

            setTxHash(hash)

            await retryWaitForTransaction({ hash })
          }
          setConfirmState(ConfirmModalState.COMPLETED)
        } catch (error: any) {
          console.error('swap error', error)
          if (userRejectedError(error)) {
            showError('Transaction rejected')
          } else {
            showError(typeof error === 'string' ? error : (error as any)?.message)
          }
        }
      },
      showIndicator: false,
      getCalldata: () => swapCalls,
    }
  }, [swapCalls, resetState, retryWaitForTransaction, safeTxHashTransformer, showError, swap, swapError])

  const xSwapStep = useMemo(() => {
    return {
      step: ConfirmModalState.PENDING_CONFIRMATION,
      action: async () => {
        setTxHash(undefined)
        setConfirmState(ConfirmModalState.PENDING_CONFIRMATION)

        if (!isXOrder(order)) {
          resetState()
          return
        }

        // if (swapError) {
        //   showError(swapError)
        //   return
        // }

        try {
          const xOrder = await sendXOrder({
            chainId: order.trade.inputAmount.currency.chainId,
            orderInfo: {
              ...order.trade.orderInfo,
              input: {
                ...order.trade.orderInfo.input,
                token:
                  order.trade.inputAmount.currency.isNative && nativeCurrency
                    ? nativeCurrency.wrapped.address
                    : order.trade.orderInfo.input.token,
              },
            },
          })
          if (xOrder?.hash) {
            setOrderHash(xOrder.hash)
            const inputAmount = order.trade.maximumAmountIn.toExact()
            const outputAmount = order.trade.minimumAmountOut.toExact()
            const input = order.trade.inputAmount.currency
            const output = order.trade.outputAmount.currency
            const { tradeType } = order.trade
            logSwap({
              tradeType,
              account: account ?? '0x',
              chainId: xOrder.chainId,
              hash: xOrder.hash,
              inputAmount,
              outputAmount,
              input,
              output,
              type: 'X',
            })
            const receipt = await waitForXOrderReceipt(xOrder)

            if (receipt.transactionHash) {
              logSwap({
                tradeType,
                account: account ?? '0x',
                chainId: xOrder.chainId,
                hash: receipt.transactionHash,
                inputAmount,
                outputAmount,
                input,
                output,
                type: 'X-Filled',
              })
              setTxHash(receipt.transactionHash)
              setConfirmState(ConfirmModalState.COMPLETED)
              toastSuccess(
                t('Success!'),
                <ToastDescriptionWithTx txHash={receipt.transactionHash} txChainId={xOrder.chainId}>
                  {t('Swap order filled')}
                </ToastDescriptionWithTx>,
              )
            }
          }
        } catch (error: any) {
          console.error('swap error', error)
          if (userRejectedError(error)) {
            showError('Transaction rejected')
          } else {
            const errorMsg = typeof error === 'string' ? error : (error as any)?.message
            showError(errorMsg)
            toastError(t('Failed'), errorMsg)
          }
        }
      },
      showIndicator: false,
    }
  }, [account, t, order, resetState, sendXOrder, showError, nativeCurrency, toastSuccess, toastError])

  const orderSubmittedStep = useMemo(() => {
    return {
      step: ConfirmModalState.ORDER_SUBMITTED,
      showIndicator: false,
      action: async () => {
        setConfirmState(ConfirmModalState.ORDER_SUBMITTED)
        toastInfo(
          t('Order Submitted'),
          <ToastDescriptionWithTx txHash="" txChainId={56}>
            {t('Bridging TOKEN to your address (TARGET_CHAIN)')}
          </ToastDescriptionWithTx>,
        )
      },
    }
  }, [t, toastInfo, setConfirmState])

  const actions = useMemo(() => {
    return {
      [ConfirmModalState.WRAPPING]: wrapStep,
      [ConfirmModalState.RESETTING_APPROVAL]: revokeStep,
      [ConfirmModalState.PERMITTING]: permitStep,
      [ConfirmModalState.APPROVING_TOKEN]: isBridgeOrder(order) ? approvalBridgeStep : approveStep,
      [ConfirmModalState.PENDING_CONFIRMATION]: isBridgeOrder(order)
        ? swapBridgeStep
        : isClassicOrder(order)
        ? swapStep
        : xSwapStep,
      [ConfirmModalState.ORDER_SUBMITTED]: orderSubmittedStep,
    } as { [k in ConfirmModalState]: ConfirmAction }
  }, [
    revokeStep,
    permitStep,
    approveStep,
    order,
    swapStep,
    xSwapStep,
    wrapStep,
    swapBridgeStep,
    orderSubmittedStep,
    approvalBridgeStep,
  ])

  return {
    txHash,
    orderHash,
    actions,

    confirmState,
    setConfirmState,
    setTxHash,
    resetState,
    errorMessage,
    showError,
  }
}

export const useConfirmModalState = (
  order: PriceOrder | undefined,
  amountToApprove: CurrencyAmount<Token> | undefined,
  spender: Address | undefined,
) => {
  const { actions, confirmState, txHash, orderHash, errorMessage, resetState, setConfirmState, setTxHash, showError } =
    useConfirmActions(order, amountToApprove, spender)
  const preConfirmState = usePreviousValue(confirmState)
  const [confirmSteps, setConfirmSteps] = useState<ConfirmModalState[]>()
  const tradePriceBreakdown = useMemo(
    () =>
      isBridgeOrder(order)
        ? computeBridgeOrderFee(order)
        : computeTradePriceBreakdown(isXOrder(order) ? undefined : order?.trade),
    [order],
  )
  const { walletType } = useWalletType()
  const { chainId } = useActiveChainId()
  const { data: walletClient } = useWalletClient({ chainId })
  const { connector } = useAccount()
  const eip5792Status = useEIP5792Status()
  const { toastError } = useToast()
  const { t } = useTranslation()
  const performEip5792Lock = useRef(false)

  const getBatchedTransaction = useCallback(
    (steps: ConfirmModalState[]) =>
      getBatchedTransactionHelper(steps, actions, chainId, amountToApprove, spender, order),
    [
      actions,
      amountToApprove?.currency.address,
      amountToApprove?.currency.isToken,
      amountToApprove?.quotient,
      chainId,
      order,
      spender,
    ],
  )

  const sendBatchedTransaction = useCallback(
    async (calls: BatchCall[]) => {
      if (!walletClient?.transport || !spender) {
        console.error('Missing required parameters')
        return null
      }

      const provider = await connector?.getProvider()
      if (!provider) return null

      const client = createWalletClient({
        transport: custom(provider as any),
        account: walletClient.account,
        chain: walletClient.chain,
      }).extend(eip5792Actions())

      try {
        const result = await client.sendCalls({
          calls,
          forceAtomic: true,
        })

        if (!result.id) {
          console.error('No transaction ID returned')
          return null
        }

        return { id: result.id, client } as const
      } catch (error) {
        console.warn('Error sending batched transaction:', error)
        if (userRejectedError(error)) {
          showError('Transaction rejected')
        } else if (!eip5792UserRejectUpgradeError(error)) {
          const errorMsg = typeof error === 'string' ? error : (error as any)?.message
          showError(errorMsg)
          toastError(t('Failed'), errorMsg)
        }
        throw error
      }
    },
    [connector, walletClient, spender, t, toastError, showError],
  )

  const confirmPriceImpactWithoutFee = useAsyncConfirmPriceImpactWithoutFee(
    (Array.isArray(tradePriceBreakdown)
      ? getBridgeOrderPriceImpact(tradePriceBreakdown)
      : tradePriceBreakdown?.priceImpactWithoutFee) as Percent,
    PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN,
    ALLOWED_PRICE_IMPACT_HIGH,
  )

  const swapPreflightCheck = useCallback(async () => {
    if (tradePriceBreakdown) {
      const confirmed = await confirmPriceImpactWithoutFee()
      if (!confirmed) {
        return false
      }
    }
    return true
  }, [confirmPriceImpactWithoutFee, tradePriceBreakdown])

  const createSteps = useCreateConfirmSteps(order, amountToApprove, spender)
  const confirmActions = useMemo(() => {
    return confirmSteps?.map((step) => actions[step])
  }, [confirmSteps, actions])

  const performStep = useCallback(
    async ({
      nextStep,
      stepActions,
      state,
    }: {
      nextStep?: ConfirmModalState
      stepActions: ConfirmAction[]
      state: ConfirmModalState
    }) => {
      if (!stepActions) {
        return
      }

      const step = stepActions.find((s) => s.step === state) ?? stepActions[0]
      await step.action(nextStep)
    },
    [],
  )

  const canCallActionBatched = useCallback(
    (steps: ConfirmModalState[]) => {
      if (!walletClient?.transport || !spender) {
        return false
      }
      // Disable batching for Base chain
      if (chainId === ChainId.BASE) {
        return false
      }
      if (eip5792Status === 'unsupported' || steps.length <= 1) {
        return false
      }
      const calls = getBatchedTransaction(steps)
      if (!calls || calls.length < steps.length) {
        return false
      }
      return true
    },
    [eip5792Status, getBatchedTransaction, walletClient?.transport, spender, chainId],
  )

  const callActionBatched = useCallback(
    async (steps: ConfirmModalState[]) => {
      setTxHash(undefined)
      setConfirmState(ConfirmModalState.PENDING_CONFIRMATION)
      const calls = getBatchedTransaction(steps)
      if (!calls) {
        resetState()
        return
      }
      try {
        const result = await sendBatchedTransaction(calls)
        if (!result?.id || !result.client) {
          return
        }
        // Monitor transaction status using viem's EIP-5792 implementation
        const { promise: statusPromise } = retry(
          async () => {
            const status = await result.client.getCallsStatus({ id: result.id })
            if (status.status === 'failure') {
              throw new Error('Transaction failed')
            }
            if (status.status !== 'success') {
              throw new RetryableError()
            }
            return status
          },
          {
            n: 3,
            minWait: 2000,
            maxWait: 3500,
          },
        )

        const status = await statusPromise
        if (status.status === 'success') {
          setTxHash(status.receipts?.[0]?.transactionHash)
          setConfirmState(ConfirmModalState.COMPLETED)
        }
      } catch (error) {
        console.warn('[5792] Failed to call batched action:', error)
        if (userRejectedError(error) || eip5792UserRejectUpgradeError(error)) {
          throw error
        }
      }
    },
    [setConfirmState, resetState, setTxHash, getBatchedTransaction, sendBatchedTransaction, walletType],
  )

  const callToAction = useCallback(
    async (skipBatch: boolean = false) => {
      const steps = await createSteps()

      setConfirmSteps(steps)

      if (!(await swapPreflightCheck())) {
        return
      }

      if (!skipBatch) {
        const canCallBatch = canCallActionBatched(steps)
        if (canCallBatch) {
          try {
            logGTMSwapTxSentEvent({
              walletType: WalletType[walletType],
              txType: 'batch',
              chainId,
              symbol: amountToApprove?.currency.symbol,
            })
            performEip5792Lock.current = true
            await callActionBatched(steps)
            return
          } catch (error) {
            if (eip5792UserRejectUpgradeError(error)) {
              setTimeout(() => {
                callToAction(true)
              })
            }
          } finally {
            performEip5792Lock.current = false
          }
          return
        }
      }
      logGTMSwapTxSentEvent({
        walletType: WalletType[walletType],
        txType: 'normal',
        chainId,
        symbol: amountToApprove?.currency.symbol,
      })
      // Use existing sequential execution
      const stepActions = steps.map((step) => actions[step])
      const nextStep = steps[1] ?? undefined
      performStep({
        nextStep,
        stepActions,
        state: steps[0],
      })
    },
    [canCallActionBatched, callActionBatched, actions, createSteps, performStep, swapPreflightCheck],
  )

  // auto perform the next step
  useEffect(() => {
    if (
      preConfirmState !== confirmState &&
      preConfirmState !== ConfirmModalState.REVIEWING &&
      confirmActions?.some((step) => step.step === confirmState) &&
      !performEip5792Lock.current
    ) {
      const nextStep = confirmActions.findIndex((step) => step.step === confirmState)
      const nextStepState = confirmActions[nextStep + 1]?.step ?? ConfirmModalState.PENDING_CONFIRMATION
      performStep({ nextStep: nextStepState, stepActions: confirmActions, state: confirmState })
    }
  }, [performEip5792Lock, confirmActions, confirmState, performStep, preConfirmState])

  return {
    callToAction,
    errorMessage,
    confirmState,
    resetState,
    txHash,
    orderHash,
    confirmActions,
  }
}
