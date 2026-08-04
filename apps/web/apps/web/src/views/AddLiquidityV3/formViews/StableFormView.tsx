import { AutoColumn, Box, Button, Card, CardBody, Column, Dots, PreTitle, RowBetween, Text } from '@pancakeswap/uikit'

import { CommitButton } from 'components/CommitButton'

import { ApprovalState } from 'hooks/useApproveCallback'
import { logGTMClickAddLiquidityEvent } from 'utils/customGTMEventTracking'
import { CurrencyField as Field } from 'utils/types'

import { useTranslation } from '@pancakeswap/localization'
import { useIsExpertMode } from '@pancakeswap/utils/user'

import ConnectWalletButton from 'components/ConnectWalletButton'

import { Percent } from '@pancakeswap/sdk'

import { useIsTransactionUnsupported, useIsTransactionWarning } from 'hooks/Trades'
import { AddStableChildrenProps } from 'views/AddLiquidity/AddStableLiquidity'

import { useActiveChainId } from 'hooks/useActiveChainId'
import { ReactElement } from 'react'

import { MevProtectToggle } from 'views/Mev/MevProtectToggle'
import { useAccount } from 'wagmi'
import CurrencyInputPanelSimplify from 'components/CurrencyInputPanelSimplify'
import { SlippageButton } from 'views/Swap/components/SlippageButton'
import { formatDollarAmount } from 'views/V3Info/utils/numbers'

export default function StableFormView({
  formattedAmounts,
  shouldShowApprovalGroup,
  approveACallback,
  approvalA,
  approvalB,
  approveBCallback,
  showFieldBApproval,
  showFieldAApproval,
  currencies,
  buttonDisabled,
  onAdd,
  onPresentAddLiquidityModal,
  errorText,
  onFieldAInput,
  onFieldBInput,
  poolTokenPercentage,
  pair,
  reserves,
  stableTotalFee,
  stableAPR,
  executionSlippage,
  loading,
  infoLoading,
  price,
  maxAmounts,
  inputAmountsTotalUsdValue,
}: AddStableChildrenProps & {
  stableTotalFee?: number
}) {
  const addIsUnsupported = useIsTransactionUnsupported(currencies?.CURRENCY_A, currencies?.CURRENCY_B)
  const addIsWarning = useIsTransactionWarning(currencies?.CURRENCY_A, currencies?.CURRENCY_B)

  const { t } = useTranslation()
  const { isWrongNetwork } = useActiveChainId()
  const { address: account } = useAccount()
  const expertMode = useIsExpertMode()

  let buttons: ReactElement
  if (addIsUnsupported || addIsWarning) {
    buttons = (
      <Button disabled mb="4px">
        {t('Unsupported Asset')}
      </Button>
    )
  } else if (!account) {
    buttons = <ConnectWalletButton width="100%" />
  } else if (isWrongNetwork) {
    buttons = <CommitButton />
  } else {
    buttons = (
      <AutoColumn gap="md">
        {shouldShowApprovalGroup && (
          <RowBetween style={{ gap: '8px' }}>
            {showFieldAApproval && (
              <Button onClick={approveACallback} disabled={approvalA === ApprovalState.PENDING} width="100%">
                {approvalA === ApprovalState.PENDING ? (
                  <Dots>{t('Enabling %asset%', { asset: currencies[Field.CURRENCY_A]?.symbol })}</Dots>
                ) : (
                  t('Enable %asset%', { asset: currencies[Field.CURRENCY_A]?.symbol })
                )}
              </Button>
            )}
            {showFieldBApproval && (
              <Button onClick={approveBCallback} disabled={approvalB === ApprovalState.PENDING} width="100%">
                {approvalB === ApprovalState.PENDING ? (
                  <Dots>{t('Enabling %asset%', { asset: currencies[Field.CURRENCY_B]?.symbol })}</Dots>
                ) : (
                  t('Enable %asset%', { asset: currencies[Field.CURRENCY_B]?.symbol })
                )}
              </Button>
            )}
          </RowBetween>
        )}
        <CommitButton
          variant={buttonDisabled ? 'danger' : 'primary'}
          onClick={() => {
            // eslint-disable-next-line no-unused-expressions
            expertMode ? onAdd() : onPresentAddLiquidityModal()
            logGTMClickAddLiquidityEvent()
          }}
          disabled={buttonDisabled}
        >
          {errorText || t('Add')}
        </CommitButton>
      </AutoColumn>
    )
  }

  return (
    <Box mx="auto" pb="16px" width="100%" maxWidth={[null, null, null, null, '480px']}>
      <Card>
        <CardBody>
          <AutoColumn>
            <CurrencyInputPanelSimplify
              showUSDPrice
              maxAmount={maxAmounts[Field.CURRENCY_A]}
              onMax={() => onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')}
              onPercentInput={(percent) => {
                if (maxAmounts[Field.CURRENCY_A]) {
                  onFieldAInput(maxAmounts[Field.CURRENCY_A]?.multiply(new Percent(percent, 100)).toExact() ?? '')
                }
              }}
              disableCurrencySelect
              defaultValue={formattedAmounts[Field.CURRENCY_A]}
              onUserInput={onFieldAInput}
              showQuickInputButton
              showMaxButton
              currency={currencies[Field.CURRENCY_A]}
              id="stable-add-liquidity-input-tokena"
              title={<PreTitle>{t('Deposit Amount')}</PreTitle>}
            />
            <Box my="4px" />
            <CurrencyInputPanelSimplify
              showUSDPrice
              disableCurrencySelect
              maxAmount={maxAmounts[Field.CURRENCY_B]}
              onPercentInput={(percent) => {
                if (maxAmounts[Field.CURRENCY_B]) {
                  onFieldBInput(maxAmounts[Field.CURRENCY_B]?.multiply(new Percent(percent, 100)).toExact() ?? '')
                }
              }}
              onMax={() => onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')}
              defaultValue={formattedAmounts[Field.CURRENCY_B]}
              onUserInput={onFieldBInput}
              showQuickInputButton
              showMaxButton
              currency={currencies[Field.CURRENCY_B]}
              id="stable-add-liquidity-input-tokenb"
              title={<>&nbsp;</>}
            />
            <Column mt="16px" gap="16px">
              <RowBetween>
                <Text color="textSubtle">Total</Text>
                <Text>~{formatDollarAmount(inputAmountsTotalUsdValue, 2, false)}</Text>
              </RowBetween>
              <RowBetween>
                <Text color="textSubtle">Slippage Tolerance</Text>
                <SlippageButton />
              </RowBetween>
              <RowBetween>
                <Text color="textSubtle">{t('Your share in pool')}</Text>
                <Text>{poolTokenPercentage ? `${poolTokenPercentage?.toSignificant(4)}%` : '-'}</Text>
              </RowBetween>
            </Column>
            <Box mt="8px">
              <MevProtectToggle size="sm" />
            </Box>
            <Box mt="16px">{buttons}</Box>
          </AutoColumn>
        </CardBody>
      </Card>
    </Box>
  )
}
