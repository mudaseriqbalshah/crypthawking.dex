import { useTranslation } from '@pancakeswap/localization'
import {
  Box,
  ChevronRightIcon,
  Flex,
  FlexGap,
  ModalV2,
  MotionModal,
  SwapLoading,
  Text,
  useModalV2,
} from '@pancakeswap/uikit'
import { useMemo } from 'react'

import {
  ChainLogo,
  TransactionListItemTitle,
  TransactionListItemV2,
  TransactionStatusV2,
} from '@pancakeswap/widgets-internal'

import styled from 'styled-components'

import { CurrencyAmount } from '@pancakeswap/swap-sdk-core'
import { formatScientificToDecimal } from '@pancakeswap/utils/formatNumber'
import { useQuery } from '@tanstack/react-query'
import { ViewOnExplorerButton } from 'components/ViewOnExplorerButton'
import { DISPLAY_PRECISION } from 'config/constants/formatting'
import { useCurrencyByChainId } from 'hooks/Tokens'
import { multiChainName, multiChainShortName } from 'state/info/constant'
import { getFullChainNameById } from 'utils/getFullChainNameById'
import { OrderResultModalContent } from 'views/Swap/Bridge/CrossChainConfirmSwapModal/OrderStatus/OrderResultModalContent'
import { bridgeStatusQueryKey } from 'views/Swap/Bridge/hooks/useBridgeStatus'
import { ActiveBridgeOrderMetadata, BridgeStatus, UserBridgeOrder } from 'views/Swap/Bridge/types'
import { getBridgeTitle } from 'views/Swap/Bridge/utils/bridgeTitle'
import { customBridgeStatus } from 'views/Swap/Bridge/utils/customBridgeStatus'

const StyledChainLogo = styled(ChainLogo)`
  > img {
    width: 22px;
    height: 22px;
    border-radius: 38%;
    border: 1px solid ${({ theme }) => theme.colors.invertedContrast};
  }
`

export function CrossChainTransaction({ order }: { order: UserBridgeOrder }) {
  const { t } = useTranslation()
  const modal = useModalV2()

  const status = useMemo(() => {
    if (order.status === BridgeStatus.SUCCESS) {
      return TransactionStatusV2.Success
    }
    if (order.status === BridgeStatus.FAILED) {
      return TransactionStatusV2.Failed
    }
    if (order.status === BridgeStatus.PARTIAL_SUCCESS) {
      return TransactionStatusV2.PartialSuccess
    }

    return TransactionStatusV2.Pending
  }, [order.status])

  const inputChainId = order.originChainId
  const outputChainId = order.destinationChainId

  const inputChainName = getFullChainNameById(inputChainId)
  const outputChainName = getFullChainNameById(outputChainId)

  const inputToken = useCurrencyByChainId(order.inputToken, inputChainId)
  const outputToken = useCurrencyByChainId(order.outputToken, outputChainId)

  const inputAmount =
    inputToken && CurrencyAmount.fromRawAmount(inputToken, formatScientificToDecimal(order.inputAmount))

  const outputAmount =
    outputToken &&
    CurrencyAmount.fromRawAmount(
      outputToken,
      formatScientificToDecimal(order.status === BridgeStatus.SUCCESS ? order.outputAmount : order.minOutputAmount),
    )

  const metadata: ActiveBridgeOrderMetadata['metadata'] = {
    status: order.status,
    inputToken: order.inputToken,
    outputToken: order.outputToken,
    inputAmount: order.inputAmount,
    outputAmount: order.outputAmount,
    minOutputAmount: order.minOutputAmount,
    originChainId: order.originChainId,
    destinationChainId: order.destinationChainId,
  }

  const { data: bridgeStatusData, isFetching } = useQuery({
    queryKey: bridgeStatusQueryKey(inputChainId, order.transactionHash),
  })

  const isBridgeStatusLoading = !bridgeStatusData && isFetching

  if (!inputToken || !outputToken || !inputChainId || !outputChainId) {
    // Show FAILED State
    return (
      <TransactionListItemV2 status={TransactionStatusV2.Failed}>
        <Text bold small>
          {t('Failed')}
        </Text>
      </TransactionListItemV2>
    )
  }

  return (
    <>
      <TransactionListItemV2
        onClick={modal.onOpen}
        status={status}
        title={
          <FlexGap alignItems="center" gap="4px">
            <FlexGap alignItems="center">
              <StyledChainLogo chainId={inputChainId} />
              <StyledChainLogo chainId={outputChainId} ml="-8px" />
            </FlexGap>

            <TransactionListItemTitle>
              {t('Swap %inputChainName% to %outputChainName%', {
                inputChainName,
                outputChainName,
              })}
            </TransactionListItemTitle>
          </FlexGap>
        }
        action={
          <FlexGap gap="0.25rem" justifyContent="flex-end">
            {order.transactionHash ? (
              <ViewOnExplorerButton
                chainId={order.fillTransactionHash ? order.destinationChainId : order.originChainId}
                address={order.fillTransactionHash || order.transactionHash}
                type="transaction"
                color="primary60"
              />
            ) : (
              <ChevronRightIcon
                style={{ cursor: 'pointer' }}
                fontSize="1.25rem"
                color="textSubtle"
                onClick={modal.onOpen}
              />
            )}
          </FlexGap>
        }
      >
        <Box maxWidth={[null, null, null, '380px']}>
          <Text small>
            {status === TransactionStatusV2.PartialSuccess ? (
              <Text as="span" small bold>
                {t('Incomplete')}:&nbsp;
              </Text>
            ) : status === TransactionStatusV2.Failed ? (
              <Text as="span" small bold>
                {t('Failed')}:&nbsp;
              </Text>
            ) : null}
            {t('Swap')}&nbsp;
            <Text as="span" bold small>
              {inputAmount?.toSignificant(DISPLAY_PRECISION)}&nbsp;
              {inputToken?.symbol}
            </Text>
            &nbsp; (
            {t('on %chainSymbol%', { chainSymbol: multiChainShortName[inputChainId] ?? multiChainName[inputChainId] })}){' '}
            {t('for')}&nbsp;
            <Text as="span" bold small>
              {outputAmount?.toSignificant(DISPLAY_PRECISION)}&nbsp;
              {outputToken?.symbol}
            </Text>
            &nbsp; (
            {t('on %chainSymbol%', {
              chainSymbol: multiChainShortName[outputChainId] ?? multiChainName[outputChainId],
            })}
            )
          </Text>
          {order.transactionHash && (
            <FlexGap mt="1px" alignItems="center">
              <Text color="textSubtle" small>
                {t('Details')}
              </Text>
              <ChevronRightIcon mt="1px" width="18px" color="textSubtle" />
            </FlexGap>
          )}
        </Box>
      </TransactionListItemV2>
      <ModalV2 {...modal} closeOnOverlayClick>
        <MotionModal
          title={
            <Flex alignItems="center">
              {getBridgeTitle(t, customBridgeStatus(order))}
              {isBridgeStatusLoading && <SwapLoading size="24px" ml="8px" />}
            </Flex>
          }
          headerBorderColor="transparent"
          bodyPadding="0 24px 24px"
          minWidth={[null, null, null, '400px']}
          minHeight="200px"
        >
          <OrderResultModalContent
            overrideActiveOrderMetadata={{
              txHash: order.transactionHash,
              originChainId: order.originChainId,
              order: null,
              metadata,
            }}
          />
        </MotionModal>
      </ModalV2>
    </>
  )
}
