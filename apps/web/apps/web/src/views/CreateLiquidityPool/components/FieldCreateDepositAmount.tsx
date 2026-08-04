import { useTranslation } from '@pancakeswap/localization'
import { Box, BoxProps, ErrorIcon, FlexGap, Text, useTooltip } from '@pancakeswap/uikit'
import { FieldDepositAmount } from 'components/Liquidity/Form/FieldDepositAmount'
import { useSelectIdRouteParams } from 'hooks/dynamicRoute/useSelectIdRoute'
import { useCreateDepositAmounts, useCreateDepositAmountsEnabled } from '../hooks/useCreateDepositAmounts'
import { useCurrencies } from '../hooks/useCurrencies'

type FieldDepositAmountProps = BoxProps

export const FieldCreateDepositAmount: React.FC<FieldDepositAmountProps> = ({ ...boxProps }) => {
  const { t } = useTranslation()
  const { chainId } = useSelectIdRouteParams()
  const { baseCurrency, quoteCurrency } = useCurrencies()
  const { handleDepositAmountChange, inputValue0, inputValue1 } = useCreateDepositAmounts()

  const { isDeposit0Enabled, isDepositEnabled, isDeposit1Enabled } = useCreateDepositAmountsEnabled()

  const { targetRef, tooltip } = useTooltip(
    <>
      <Text>
        {t(
          'This pool must be initialized before you can add liquidity. To initialize, select a starting price for the pool. Then, enter your liquidity price range and deposit amount. Gas fees will be higher than usual due to the initialization transaction.',
        )}
      </Text>
      <Text>{t('Fee-on transfer tokens and rebasing tokens are NOT compatible.')}</Text>
    </>,
    {
      placement: 'top',
    },
  )

  return (
    <Box>
      <FieldDepositAmount
        {...boxProps}
        chainId={chainId}
        baseCurrency={baseCurrency}
        quoteCurrency={quoteCurrency}
        handleDepositAmountChange={handleDepositAmountChange}
        inputValue0={inputValue0}
        inputValue1={inputValue1}
        isDepositEnabled={isDepositEnabled}
        isDeposit0Enabled={isDeposit0Enabled}
        isDeposit1Enabled={isDeposit1Enabled}
      />
      {!isDepositEnabled ? (
        <FlexGap gap="6px" mt="8px">
          <ErrorIcon color="yellow" />
          <Text color="yellow">{t('Set starting price & price range first.')}</Text>
          <Text ref={targetRef} color="yellow" style={{ textDecoration: 'underline' }}>
            {t('Why?')}
          </Text>
          {tooltip}
        </FlexGap>
      ) : null}
    </Box>
  )
}
