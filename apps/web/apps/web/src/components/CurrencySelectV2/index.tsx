import { useTranslation } from '@pancakeswap/localization'
import {
  ArrowDropDownIcon,
  Box,
  BoxProps,
  DropDownContainer,
  DropDownHeader,
  Flex,
  Text,
  useModal,
} from '@pancakeswap/uikit'
import { formatNumber } from '@pancakeswap/utils/formatBalance'
import { formatAmount } from '@pancakeswap/utils/formatFractions'
import CurrencySearchModalV2, { CurrencySearchModalV2Props } from 'components/SearchModal/CurrencySearchModalV2'
import { useStablecoinPrice } from 'hooks/useStablecoinPrice'
import { useCurrencyBalanceWithChain } from 'state/wallet/hooks'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import { AutoRow, RowBetween } from '../Layout/Row'
import { CurrencyLogo } from '../Logo'

interface CurrencySelectV2Props extends CurrencySearchModalV2Props, BoxProps {
  hideBalance?: boolean
}

const StyledDropDownContainer = styled(DropDownContainer)`
  min-width: auto;
`

/**
 * Currency Select, including custom chainId
 */
export const CurrencySelectV2 = ({
  onCurrencySelect,
  selectedCurrency,
  otherSelectedCurrency,
  showCommonBases,
  commonBasesType,
  hideBalance,
  chainId,
  tokensToShow,
  ...props
}: CurrencySelectV2Props) => {
  const { address: account } = useAccount()

  const selectedCurrencyBalance = useCurrencyBalanceWithChain(
    account ?? undefined,
    !hideBalance && selectedCurrency ? selectedCurrency : undefined,
    chainId,
  )

  const { t } = useTranslation()

  const [onPresentCurrencyModal] = useModal(
    <CurrencySearchModalV2
      tokensToShow={tokensToShow}
      onCurrencySelect={onCurrencySelect}
      selectedCurrency={selectedCurrency}
      otherSelectedCurrency={otherSelectedCurrency}
      showCommonBases={showCommonBases}
      commonBasesType={commonBasesType}
      chainId={chainId}
    />,
  )

  const price = useStablecoinPrice(selectedCurrencyBalance && selectedCurrency ? selectedCurrency : undefined, {
    enabled: Boolean(selectedCurrencyBalance?.greaterThan(0)),
  })
  const quoted = selectedCurrencyBalance && price?.quote(selectedCurrencyBalance)

  return (
    <Box width="100%" {...props}>
      <StyledDropDownContainer p={0} onClick={onPresentCurrencyModal}>
        <DropDownHeader justifyContent="space-between">
          <Text id="pair" color={!selectedCurrency ? 'text' : undefined}>
            {!selectedCurrency ? (
              <>{t('Select')}</>
            ) : (
              <Flex alignItems="center" justifyContent="space-between">
                <CurrencyLogo currency={selectedCurrency} size="24px" style={{ marginRight: '8px' }} />
                <Text id="pair" bold ellipsis pr="16px">
                  {selectedCurrency && selectedCurrency.symbol && selectedCurrency.symbol.length > 20
                    ? `${selectedCurrency.symbol.slice(0, 4)}...${selectedCurrency.symbol.slice(
                        selectedCurrency.symbol.length - 5,
                        selectedCurrency.symbol.length,
                      )}`
                    : selectedCurrency?.symbol}
                </Text>
              </Flex>
            )}
          </Text>
        </DropDownHeader>
        <ArrowDropDownIcon color="text" className="down-icon" />
      </StyledDropDownContainer>
      {account && !!selectedCurrency && !hideBalance && (
        <Box>
          <AutoRow justify="space-between" gap="2px">
            <Text color="textSubtle" fontSize="12px">
              {t('Balance')}:
            </Text>
            <Text fontSize="12px">{formatAmount(selectedCurrencyBalance, 6) ?? t('Loading')}</Text>
          </AutoRow>
          <RowBetween>
            <div />
            {quoted && Number.isFinite(+quoted?.toExact()) && (
              <Text fontSize="12px" color="textSubtle">
                ~${formatNumber(+quoted.toExact())}
              </Text>
            )}
          </RowBetween>
        </Box>
      )}
    </Box>
  )
}
