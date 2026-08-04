import { useTranslation } from '@pancakeswap/localization'
import { ChainId, Currency, CurrencyAmount, Token } from '@pancakeswap/sdk'
import { WrappedTokenInfo } from '@pancakeswap/token-lists'
import { ArrowForwardIcon, AutoColumn, Column, CopyButton, FlexGap, QuestionHelper, Text } from '@pancakeswap/uikit'
import { formatAmount } from '@pancakeswap/utils/formatFractions'
import { CurrencyLogo } from '@pancakeswap/widgets-internal'
import AddToWalletButton from 'components/AddToWallet/AddToWalletButton'
import { LightGreyCard } from 'components/Card'
import { ViewOnExplorerButton } from 'components/ViewOnExplorerButton'
import { useCurrencyUsdPrice } from 'hooks/useCurrencyUsdPrice'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { CSSProperties, MutableRefObject, useCallback, useMemo, useState } from 'react'
import { FixedSizeList } from 'react-window'
import { styled } from 'styled-components'
import { getTokenSymbolAlias } from 'utils/getTokenAlias'
import { wrappedCurrency } from 'utils/wrappedCurrency'
import { useAccount } from 'wagmi'
import { useIsUserAddedToken } from '../../hooks/Tokens'
import { useCombinedActiveList } from '../../state/lists/hooks'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { isTokenOnList } from '../../utils'
import { RowBetween, RowFixed } from '../Layout/Row'
import CircleLoader from '../Loader/CircleLoader'
import ImportRow from './ImportRow'

function currencyKey(currency: Currency): string {
  return currency?.isToken ? currency.address : currency?.isNative ? currency.symbol : ''
}

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 5rem;
  text-overflow: ellipsis;
`

const FixedContentRow = styled.div`
  padding: 4px 20px;
  height: 56px;
  display: grid;
  grid-gap: 16px;
  align-items: center;
`

function Balance({ balance }: { balance: CurrencyAmount<Currency> }) {
  return (
    <StyledBalanceText title={balance.toExact()} bold>
      {formatAmount(balance, 4)}
    </StyledBalanceText>
  )
}

const MenuItem = styled(RowBetween)`
  height: 56px;
  padding: 0 8px;
`

const MenuItemInner = styled.div<{ disabled?: boolean; selected: boolean }>`
  width: 100%;
  padding: 6px 12px;
  border-radius: 16px;

  display: grid;
  grid-template-columns: auto minmax(auto, 1fr) minmax(0, 72px);
  grid-gap: 10px;
  cursor: ${({ disabled }) => !disabled && 'pointer'};
  &:hover {
    background-color: ${({ theme, disabled }) => !disabled && theme.colors.background};
  }
  opacity: ${({ disabled, selected }) => (disabled || selected ? 0.5 : 1)};

  transition: background-color 0.1s;
`

function ComplementSection({
  selectedCurrency,
  isSelected,
  showActions,
}: {
  selectedCurrency: Currency
  isSelected: boolean
  showActions: boolean
}) {
  const { t } = useTranslation()

  if (selectedCurrency.isNative) {
    return null
  }

  return (
    <FlexGap ml="8px" alignItems="center">
      {isSelected ? (
        <>
          <CopyButton
            data-dd-action-name="Copy token address"
            width="13px"
            buttonColor="textSubtle"
            text={selectedCurrency.wrapped.address}
            tooltipMessage={t('Token address copied')}
            defaultTooltipMessage={t('Copy token address')}
            tooltipPlacement="top"
          />
          <ViewOnExplorerButton
            address={selectedCurrency.wrapped.address}
            chainId={selectedCurrency.chainId}
            type="token"
            color="textSubtle"
            width="15px"
            ml="8px"
            tooltipPlacement="top"
          />
          <AddToWalletButton
            data-dd-action-name="Add to wallet"
            variant="text"
            p="0"
            ml="12px"
            height="auto"
            width="fit-content"
            tokenAddress={selectedCurrency.wrapped.address}
            tokenSymbol={selectedCurrency.symbol}
            tokenDecimals={selectedCurrency.decimals}
            tokenLogo={
              selectedCurrency.wrapped instanceof WrappedTokenInfo ? selectedCurrency.wrapped.logoURI : undefined
            }
            tooltipPlacement="top"
          />
        </>
      ) : (
        showActions && (
          <CopyButton
            data-dd-action-name="Copy token address"
            width="13px"
            buttonColor="textSubtle"
            text={selectedCurrency.wrapped.address}
            tooltipMessage={t('Token address copied')}
            defaultTooltipMessage={t('Copy token address')}
            tooltipPlacement="top"
            opacity={0.5}
          />
        )
      )}
    </FlexGap>
  )
}

function CurrencyRow({
  currency,
  onSelect,
  isSelected,
  otherSelected,
  style,
  showChainLogo,
}: {
  currency: Currency
  onSelect: () => void
  isSelected: boolean
  otherSelected: boolean
  style: CSSProperties
  showChainLogo?: boolean
}) {
  const { address: account } = useAccount()
  const { t } = useTranslation()
  const key = currencyKey(currency)
  const selectedTokenList = useCombinedActiveList()
  const isOnSelectedList = isTokenOnList(selectedTokenList, currency)
  const customAdded = useIsUserAddedToken(currency)
  const [isHovered, setIsHovered] = useState(false)

  const balance = useCurrencyBalance(account ?? undefined, currency)
  const currencyUsdPrice = useCurrencyUsdPrice(currency, { enabled: Boolean(balance) })
  const balanceUSD = useMemo(() => {
    if (!balance || !currencyUsdPrice.data) return undefined
    return (Number(balance.toExact()) * currencyUsdPrice.data).toFixed(2)
  }, [balance, currencyUsdPrice])

  const setIsHoveredCallback = useCallback(() => {
    setIsHovered(true)
  }, [])

  const setIsHoveredLeaveCallback = useCallback(() => {
    setIsHovered(false)
  }, [])

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem style={style} className={`token-item-${key}`}>
      <MenuItemInner
        disabled={isSelected}
        selected={otherSelected}
        onClick={() => (isSelected ? null : onSelect())}
        onMouseEnter={setIsHoveredCallback}
        onMouseLeave={setIsHoveredLeaveCallback}
      >
        <CurrencyLogo showChainLogo={showChainLogo} currency={currency} size="40px" />

        <Column>
          <FlexGap alignItems="center">
            <Text bold>{getTokenSymbolAlias(currency?.wrapped?.address, currency?.chainId, currency?.symbol)}</Text>
            <ComplementSection isSelected={isSelected} selectedCurrency={currency} showActions={isHovered} />
          </FlexGap>
          <Text color="textSubtle" small ellipsis maxWidth="200px">
            {!isOnSelectedList && customAdded && `${t('Added by user')} •`} {currency?.name}
          </Text>
        </Column>
        <RowFixed style={{ justifySelf: 'flex-end' }}>
          {balance ? (
            <AutoColumn justify="flex-end">
              <Balance balance={balance} />
              <div>
                {balanceUSD && Number(balanceUSD) > 0 && (
                  <Text color="textSubtle" small ellipsis maxWidth="200px">
                    ${balanceUSD}
                  </Text>
                )}
              </div>
            </AutoColumn>
          ) : account ? (
            <CircleLoader />
          ) : (
            <ArrowForwardIcon />
          )}
        </RowFixed>
      </MenuItemInner>
    </MenuItem>
  )
}

export default function CurrencyList({
  height,
  currencies,
  inactiveCurrencies,
  selectedCurrency,
  onCurrencySelect,
  otherCurrency,
  fixedListRef,
  showNative,
  showImportView,
  setImportToken,
  breakIndex,
  showChainLogo,
  chainId,
}: {
  height: number | string
  currencies: Currency[]
  inactiveCurrencies: Currency[]
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherCurrency?: Currency | null
  fixedListRef?: MutableRefObject<FixedSizeList | undefined>
  showNative: boolean
  showImportView: () => void
  setImportToken: (token: Token) => void
  breakIndex: number | undefined
  showChainLogo?: boolean
  chainId?: ChainId
}) {
  const native = useNativeCurrency(chainId)

  const itemData: (Currency | undefined)[] = useMemo(() => {
    let formatted: (Currency | undefined)[] = showNative
      ? [native, ...currencies, ...inactiveCurrencies]
      : [...currencies, ...inactiveCurrencies]
    if (breakIndex !== undefined) {
      formatted = [...formatted.slice(0, breakIndex), undefined, ...formatted.slice(breakIndex, formatted.length)]
    }
    return formatted
  }, [breakIndex, currencies, inactiveCurrencies, showNative, native])

  const { t } = useTranslation()

  const Row = useCallback(
    ({ data, index, style }) => {
      const currency: any = data[index]

      const isSelected = Boolean(selectedCurrency && currency && selectedCurrency.equals(currency))
      const otherSelected = Boolean(otherCurrency && currency && otherCurrency.equals(currency))

      const handleSelect = () => onCurrencySelect(currency)
      const token = wrappedCurrency(currency, currency?.chainId)
      const showImport = index > currencies.length

      if (index === breakIndex || !data) {
        return (
          <FixedContentRow style={style}>
            <LightGreyCard padding="8px 12px" borderRadius="8px">
              <RowBetween>
                <Text small>{t('Expanded results from inactive Token Lists')}</Text>
                <QuestionHelper
                  text={t(
                    "Tokens from inactive lists. Import specific tokens below or click 'Manage' to activate more lists.",
                  )}
                  ml="4px"
                />
              </RowBetween>
            </LightGreyCard>
          </FixedContentRow>
        )
      }

      if (showImport && token) {
        return (
          <ImportRow
            onCurrencySelect={handleSelect}
            style={style}
            token={token}
            showImportView={showImportView}
            setImportToken={setImportToken}
            dim
          />
        )
      }
      return (
        <CurrencyRow
          style={style}
          currency={currency}
          isSelected={isSelected}
          onSelect={handleSelect}
          otherSelected={otherSelected}
          showChainLogo={showChainLogo}
        />
      )
    },
    [
      selectedCurrency,
      otherCurrency,
      currencies.length,
      breakIndex,
      onCurrencySelect,
      t,
      showImportView,
      setImportToken,
      showChainLogo,
    ],
  )

  const itemKey = useCallback((index: number, data: any) => `${currencyKey(data[index])}-${index}`, [])

  return (
    <FixedSizeList
      height={height}
      ref={fixedListRef as any}
      width="100%"
      itemData={itemData}
      itemCount={itemData.length}
      itemSize={56}
      itemKey={itemKey}
    >
      {Row}
    </FixedSizeList>
  )
}
