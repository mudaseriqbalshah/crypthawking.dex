import { getCurrencyPriceFromId, MAX_BIN_STEP, MIN_BIN_STEP } from '@pancakeswap/infinity-sdk'
import { useTranslation } from '@pancakeswap/localization'
import { Currency, isCurrencySorted } from '@pancakeswap/swap-sdk-core'
import { AutoColumn, Box, BoxProps, Button, Message, MessageText, RowBetween, Text } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import ApproveLiquidityTokens from 'components/Liquidity/ApproveLiquidityTokens'
import { useSelectIdRouteParams } from 'hooks/dynamicRoute/useSelectIdRoute'
import { useCLPriceRange } from 'hooks/infinity/useCLPriceRange'
import { usePermit2 } from 'hooks/usePermit2'
import { useStablecoinPriceAmount } from 'hooks/useStablecoinPrice'
import React, { useMemo } from 'react'
import { useInverted } from 'state/infinity/shared'
import { useCurrencyBalances } from 'state/wallet/hooks'
import { getInfinityPositionManagerAddress } from 'utils/addressHelpers'
import { CurrencyField as Field } from 'utils/types'
import { useAccount } from 'wagmi'
import { useBinIdRange } from '../hooks/useBinIdRange'
import { useCreateDepositAmounts, useCreateDepositAmountsEnabled } from '../hooks/useCreateDepositAmounts'
import { useCurrencies } from '../hooks/useCurrencies'
import { useFormSubmitCallback } from '../hooks/useFormSubmitCallback'
import {
  useInfinityBinQueryState,
  useInfinityCLQueryState,
  useInfinityCreateFormQueryState,
} from '../hooks/useInfinityFormState/useInfinityFormQueryState'
import { useStartPriceAsFraction } from '../hooks/useStartPriceAsFraction'
import { isFeeOutOfRange } from './FieldFeeLevel'

type SubmitCreateButtonProps = BoxProps

export const LowLiquidityMessage = () => {
  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <RowBetween>
        <Text ml="12px" fontSize="12px">
          {t(
            'New pools with low liquidity can have bigger price swings, increasing the risk of losses. Please proceed carefully.',
          )}
        </Text>
      </RowBetween>
    </Message>
  )
}

export const OutOfRangeMessage = () => {
  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <RowBetween>
        <Text ml="12px" fontSize="12px">
          {t('Your position will not earn fees or be used in trades until the market price moves into your range.')}
        </Text>
      </RowBetween>
    </Message>
  )
}

export const InvalidCLRangeMessage = () => {
  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <MessageText>{t('Invalid range selected. The min price must be lower than the max price.')}</MessageText>
    </Message>
  )
}

export const LowTVLMessage = () => {
  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <RowBetween>
        <Text ml="12px" fontSize="12px">
          {t(
            'Adding liquidity to a low TVL pool carries higher risk of losses from price fluctuations. Proceed with caution.',
          )}
        </Text>
      </RowBetween>
    </Message>
  )
}

export const MarketPriceSlippageWarning = ({ slippage }) => {
  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <RowBetween>
        <Text ml="12px" fontSize="12px">
          <b>{t('Warning')}: </b>
          {t(
            'The pool price shows a significant deviation from current market rates (%slippage%). This increases the risk of losses from arbitrage. Please proceed with caution.',
            { slippage },
          )}
        </Text>
      </RowBetween>
    </Message>
  )
}

export const InvalidBinRangeMessage: React.FC<{
  minBinId?: number | null
  maxBinId?: number | null
  baseCurrency?: Currency
  quoteCurrency?: Currency
  binStep?: number | null
  inverted?: boolean | null
}> = ({ minBinId, maxBinId, baseCurrency, quoteCurrency, binStep, inverted }) => {
  const [minPrice, maxPrice] = useMemo(() => {
    if (!minBinId || !maxBinId || !binStep || !baseCurrency || !quoteCurrency) return [null, null]
    const minPrice_ = getCurrencyPriceFromId(minBinId, binStep, baseCurrency, quoteCurrency)
    const maxPrice_ = getCurrencyPriceFromId(maxBinId, binStep, baseCurrency, quoteCurrency)
    if (inverted) {
      return [minPrice_.invert(), maxPrice_.invert()]
    }
    return [minPrice_, maxPrice_]
  }, [inverted, minBinId, maxBinId, binStep, baseCurrency, quoteCurrency])

  const { t } = useTranslation()
  return (
    <Message variant="warning">
      <MessageText>
        {minPrice && maxPrice
          ? t(
              'Invalid range selected. The min price must be lower than the max price. And price should around the start price: %minPrice% - %maxPrice%',
              {
                minPrice: minPrice.denominator ? minPrice.toFixed(8) : 0,
                maxPrice: maxPrice.denominator ? maxPrice.toFixed(8) : 0,
              },
            )
          : t('Invalid range selected. The min price must be lower than the max price.')}
      </MessageText>
    </Message>
  )
}

export const SubmitCreateButton: React.FC<SubmitCreateButtonProps> = ({ ...boxProps }) => {
  const { address: account } = useAccount()
  const { t } = useTranslation()
  const { depositCurrencyAmount0, depositCurrencyAmount1 } = useCreateDepositAmounts()
  const { isDeposit0Enabled, isDeposit1Enabled } = useCreateDepositAmountsEnabled()
  const { currency0, currency1 } = useCurrencies()
  const { poolType, feeTierSetting, feeLevel } = useInfinityCreateFormQueryState()
  const { tickSpacing } = useInfinityCLQueryState()
  const { lowerPrice, upperPrice } = useCLPriceRange(currency0, currency1, tickSpacing ?? undefined)
  const startPriceAsFraction = useStartPriceAsFraction()
  const { binStep, lowerBinId, upperBinId, activeId } = useInfinityBinQueryState()
  const { maxBinId, minBinId } = useBinIdRange()
  const [inverted] = useInverted()
  const { chainId } = useSelectIdRouteParams()
  const [currency0Balance, currency1Balance] = useCurrencyBalances(account, [currency0, currency1])
  const {
    approve: approveACallback,
    revoke: revokeACallback,

    isApproving: isApprovingA,
    isRevoking: isRevokingA,

    requireApprove: requireApproveA,
    requireRevoke: requireRevokeA,
    requirePermit: requirePermitA,
  } = usePermit2(
    currency0?.isNative ? undefined : depositCurrencyAmount0?.wrapped,
    getInfinityPositionManagerAddress(poolType, chainId),
    {
      overrideChainId: chainId,
    },
  )
  const {
    approve: approveBCallback,
    revoke: revokeBCallback,

    isApproving: isApprovingB,
    isRevoking: isRevokingB,

    requireApprove: requireApproveB,
    requireRevoke: requireRevokeB,
    requirePermit: requirePermitB,
  } = usePermit2(
    currency1?.isNative ? undefined : depositCurrencyAmount1?.wrapped,
    getInfinityPositionManagerAddress(poolType, chainId),
    {
      overrideChainId: chainId,
    },
  )

  const isDepositFilled = useMemo(
    () => Boolean(depositCurrencyAmount0 || depositCurrencyAmount1),
    [depositCurrencyAmount0, depositCurrencyAmount1],
  )
  const currencies = useMemo(
    () => ({ [Field.CURRENCY_A]: currency0, [Field.CURRENCY_B]: currency1 }),
    [currency0, currency1],
  )
  const shouldShowApprovalGroup = useMemo(
    () =>
      isDepositFilled &&
      (requireApproveA ||
        isApprovingA ||
        isRevokingA ||
        requireRevokeA ||
        requireApproveB ||
        isApprovingB ||
        isRevokingB ||
        requireRevokeB),
    [
      isDepositFilled,
      isApprovingA,
      isRevokingA,
      requireRevokeA,
      isApprovingB,
      isRevokingB,
      requireRevokeB,
      requireApproveA,
      requireApproveB,
    ],
  )

  const showApprovalA = useMemo(
    () =>
      (currencies[Field.CURRENCY_A]?.isToken ?? false) &&
      (requireApproveA || requireRevokeA) &&
      Boolean(depositCurrencyAmount0) &&
      isDeposit0Enabled,
    [requireApproveA, requireRevokeA, depositCurrencyAmount0, currencies, isDeposit0Enabled],
  )
  const showApprovalB = useMemo(
    () =>
      (currencies[Field.CURRENCY_B]?.isToken ?? false) &&
      (requireApproveB || requireRevokeB) &&
      Boolean(depositCurrencyAmount1) &&
      isDeposit1Enabled,
    [requireApproveB, requireRevokeB, depositCurrencyAmount1, currencies, isDeposit1Enabled],
  )

  const isBinStepValid = useMemo(() => {
    if (poolType === 'Bin') {
      return binStep !== null && binStep >= MIN_BIN_STEP && binStep <= MAX_BIN_STEP
    }
    return true
  }, [binStep, poolType])

  const outOfRange = useMemo(() => {
    if (poolType === 'Bin' && lowerBinId && upperBinId && activeId) {
      return activeId < lowerBinId || activeId > upperBinId
    }
    // @TODO: check
    if (poolType === 'CL' && lowerPrice && upperPrice && startPriceAsFraction) {
      const p = isCurrencySorted(startPriceAsFraction.baseCurrency, startPriceAsFraction.quoteCurrency)
        ? startPriceAsFraction
        : startPriceAsFraction.invert()
      return p.lessThan(lowerPrice) || p.greaterThan(upperPrice)
    }
    return false
  }, [poolType, lowerBinId, upperBinId, activeId, lowerPrice, upperPrice, startPriceAsFraction])

  const invalidBinRange = useMemo(() => {
    if (poolType === 'Bin' && lowerBinId && upperBinId) {
      if (!lowerBinId || !upperBinId) return true

      return lowerBinId > upperBinId || (minBinId && lowerBinId < minBinId) || (maxBinId && upperBinId > maxBinId)
    }
    return false
  }, [lowerBinId, maxBinId, minBinId, poolType, upperBinId])
  const invalidClRange = useMemo(() => {
    if (poolType === 'CL' && lowerPrice && upperPrice) {
      return lowerPrice.greaterThan(upperPrice)
    }
    return false
  }, [poolType, lowerPrice, upperPrice])

  const isSubmitEnabled = useMemo(
    () =>
      isBinStepValid &&
      isDepositFilled &&
      (feeTierSetting === 'static' ? Boolean(feeLevel) && !isFeeOutOfRange(feeLevel, poolType) : true),
    [isBinStepValid, isDepositFilled, feeTierSetting, feeLevel, poolType],
  )

  const onSubmit = useFormSubmitCallback()

  const submitDisabled = useMemo(() => {
    return !isSubmitEnabled || showApprovalA || showApprovalB || invalidBinRange || invalidClRange
  }, [invalidBinRange, invalidClRange, isSubmitEnabled, showApprovalA, showApprovalB])

  const buttonText = useMemo(() => {
    if ((isDeposit0Enabled && !depositCurrencyAmount0) || (isDeposit1Enabled && !depositCurrencyAmount1)) {
      return t('Enter an amount')
    }

    if (isDeposit0Enabled && depositCurrencyAmount0 && currency0Balance?.lessThan(depositCurrencyAmount0)) {
      return t('Insufficient %symbol% balance', { symbol: currency0?.symbol ?? 'Unknown' })
    }

    if (isDeposit1Enabled && depositCurrencyAmount1 && currency1Balance?.lessThan(depositCurrencyAmount1)) {
      return t('Insufficient %symbol% balance', { symbol: currency1?.symbol ?? 'Unknown' })
    }

    return t('Create')
  }, [
    currency0?.symbol,
    currency0Balance,
    currency1?.symbol,
    currency1Balance,
    depositCurrencyAmount0,
    depositCurrencyAmount1,
    isDeposit0Enabled,
    isDeposit1Enabled,
    t,
  ])

  const currency0UsdValue = useStablecoinPriceAmount(
    currency0,
    depositCurrencyAmount0 ? Number(depositCurrencyAmount0.toExact()) : undefined,
    {
      enabled: Boolean(depositCurrencyAmount0),
    },
  )
  const currency1UsdValue = useStablecoinPriceAmount(
    currency1,
    depositCurrencyAmount1 ? Number(depositCurrencyAmount1.toExact()) : undefined,
  )
  const lowLiquidity = useMemo(() => {
    if (depositCurrencyAmount0?.equalTo(0) || depositCurrencyAmount1?.equalTo(0)) return false
    const value0 = currency0UsdValue ?? 0
    const value1 = currency1UsdValue ?? 0
    if (value0 === 0 && value1 === 0) return false
    return value0 + value1 < 1000
  }, [currency0UsdValue, currency1UsdValue, depositCurrencyAmount0, depositCurrencyAmount1])

  return (
    <Box {...boxProps}>
      {/* <pre>
        {JSON.stringify(
          {
            requirePermitA,
            requirePermitB,
            requireApproveA,
            requireApproveB,
            requireRevokeA,
            requireRevokeB,
            showApprovalA,
            showApprovalB,
            isDeposit0Enabled,
            isDeposit1Enabled,
            isDepositFilled,
            feeLevel,
            isBinStepValid,
            submitDisabled,
            isSubmitEnabled,
            outOfRange,
            invalidRange,
            lowerBinId,
            upperBinId,
            activeId,
          },
          null,
          2,
        )}
      </pre> */}
      <AutoColumn gap="8px">
        {lowLiquidity && <LowLiquidityMessage />}
        {outOfRange && <OutOfRangeMessage />}
        {invalidClRange && <InvalidCLRangeMessage />}
        {invalidBinRange && (
          <InvalidBinRangeMessage
            minBinId={minBinId}
            maxBinId={maxBinId}
            binStep={binStep}
            inverted={inverted}
            baseCurrency={currency0}
            quoteCurrency={currency1}
          />
        )}
      </AutoColumn>
      <Box mb="8px" mt={lowLiquidity || outOfRange || invalidClRange || invalidBinRange ? '8px' : undefined}>
        <ApproveLiquidityTokens
          isApprovingA={isApprovingA}
          isApprovingB={isApprovingB}
          isRevokingA={isRevokingA}
          isRevokingB={isRevokingB}
          requireRevokeA={requireRevokeA}
          requireRevokeB={requireRevokeB}
          approveACallback={approveACallback}
          approveBCallback={approveBCallback}
          revokeACallback={revokeACallback}
          revokeBCallback={revokeBCallback}
          currencies={currencies}
          shouldShowApprovalGroup={shouldShowApprovalGroup}
          showFieldAApproval={showApprovalA}
          showFieldBApproval={showApprovalB}
        />
      </Box>
      {account ? (
        <Button width="100%" onClick={onSubmit} disabled={submitDisabled}>
          {buttonText}
        </Button>
      ) : (
        <ConnectWalletButton width="100%" />
      )}
    </Box>
  )
}
