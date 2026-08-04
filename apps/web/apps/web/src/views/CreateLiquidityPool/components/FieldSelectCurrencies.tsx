import { useTranslation } from '@pancakeswap/localization'
import { AddIcon, Box, BoxProps, Flex, FlexGap, PreTitle, Text, useMatchBreakpoints } from '@pancakeswap/uikit'
import { CurrencySelectV2 } from 'components/CurrencySelectV2'
import { ChainLogo } from 'components/Logo/ChainLogo'
import { CommonBasesType } from 'components/SearchModal/types'
import { useSelectIdRouteParams } from 'hooks/dynamicRoute/useSelectIdRoute'
import { chainNameConverter } from 'utils/chainNameConverter'
import { getChainFullName } from 'views/universalFarms/utils'
import { useCurrencies } from '../hooks/useCurrencies'
import { useFieldSelectCurrencies } from '../hooks/useFieldSelectCurrencies'

type FieldSelectCurrenciesProps = BoxProps

export const FieldSelectCurrencies: React.FC<FieldSelectCurrenciesProps> = ({ ...boxProps }) => {
  const { t } = useTranslation()
  const { chainId } = useSelectIdRouteParams()
  const chainName = chainId ? getChainFullName(chainId) : undefined
  const { baseCurrency, quoteCurrency } = useCurrencies()
  const { handleBaseCurrencySelect, handleQuoteCurrencySelect } = useFieldSelectCurrencies()
  const { isXs } = useMatchBreakpoints()

  return (
    <Box {...boxProps}>
      <Flex justifyContent="space-between" alignItems="center" mb="8px">
        <PreTitle>{t('Choose Token Pair')}</PreTitle>
        {chainId ? (
          <Flex>
            <ChainLogo width={16} height={16} chainId={chainId} />
            <Text ml="4px" fontSize={12} fontWeight={600} color="textSubtle">
              {chainName ? chainNameConverter(chainName) : ''}
            </Text>
          </Flex>
        ) : null}
      </Flex>
      <FlexGap gap="4px" width="100%" mb="8px" alignItems="center" flexDirection={isXs ? 'column' : 'row'}>
        <CurrencySelectV2
          id="infinity-form-select-base-currency"
          chainId={chainId}
          selectedCurrency={baseCurrency}
          onCurrencySelect={handleBaseCurrencySelect}
          showCommonBases
          commonBasesType={CommonBasesType.LIQUIDITY}
          hideBalance
        />
        <AddIcon color="textSubtle" />
        <CurrencySelectV2
          id="infinity-form-select-quote-currency"
          chainId={chainId}
          selectedCurrency={quoteCurrency}
          onCurrencySelect={handleQuoteCurrencySelect}
          showCommonBases
          commonBasesType={CommonBasesType.LIQUIDITY}
          hideBalance
        />
      </FlexGap>
    </Box>
  )
}
