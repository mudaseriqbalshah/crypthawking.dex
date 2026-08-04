import { useTranslation } from '@pancakeswap/localization'
import { Currency, CurrencyAmount, Percent, TradeType } from '@pancakeswap/sdk'
import { LegacyPair as Pair } from '@pancakeswap/smart-router/legacy-router'
import { AutoColumn, Box, Link, QuestionHelperV2, SkeletonV2, Text } from '@pancakeswap/uikit'
import { formatAmount, formatFraction } from '@pancakeswap/utils/formatFractions'
import { memo, useMemo, useState } from 'react'

import { OrderType } from '@pancakeswap/price-api-sdk'
import { NumberDisplay, SwapUIV2 } from '@pancakeswap/widgets-internal'
import BigNumber from 'bignumber.js'
import { LightGreyCard } from 'components/Card'
import { RowBetween, RowFixed } from 'components/Layout/Row'
import { currenciesUSDPriceAtom } from 'hooks/useCurrencyUsdPrice'
import { useAtomValue } from 'jotai'
import { Field } from 'state/swap/actions'
import { styled } from 'styled-components'
import { BridgeFeeToolTip, TotalFeeToolTip, TradingFeeToolTip } from 'views/Swap/Bridge/components/FeeToolTip'
import { BridgeOrderFee, getBridgeOrderPriceImpact } from 'views/Swap/Bridge/utils'
import { formatDollarAmount } from 'views/V3Info/utils/numbers'
import { EstimatedTime } from '../../Swap/Bridge/CrossChainConfirmSwapModal/components/EstimatedTime'
import { SlippageAdjustedAmounts, TradePriceBreakdown } from '../../Swap/V3Swap/utils/exchange'
import FormattedPriceImpact from '../../Swap/components/FormattedPriceImpact'
import { SlippageButton } from '../../Swap/components/SlippageButton'
import { useFeeSaved } from '../../Swap/hooks/useFeeSaved'

const DetailsTitle = styled(Text)`
  text-decoration: underline dotted;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSubtle};
  line-height: 150%;
  cursor: help;
`

type DisplayFee = {
  label: string
  amount: BigNumber
  hasDynamicFee: boolean
}

const BridgeTradingViewSection = ({ priceBreakdown }: { priceBreakdown: BridgeOrderFee[] }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const lpFeeAmounts = useMemo(() => {
    return priceBreakdown.filter((p) => p.lpFeeAmount).map((p) => p.lpFeeAmount as CurrencyAmount<Currency>)
  }, [priceBreakdown])

  const currencies = useMemo(() => {
    return lpFeeAmounts.map((lp) => lp.currency)
  }, [lpFeeAmounts])

  const usdPrices = useAtomValue(currenciesUSDPriceAtom(currencies))

  const currencyUsdPrices = useMemo(() => {
    return lpFeeAmounts.map((lpFeeAmount, index) => {
      return new BigNumber(lpFeeAmount?.toExact() ?? 0).times(usdPrices[index] ?? 0)
    })
  }, [usdPrices, lpFeeAmounts])

  // Group and sum up fees by type
  const groupedFees = useMemo(() => {
    return priceBreakdown
      .filter((p) => p.lpFeeAmount)
      .reduce((acc, curr, index) => {
        const { type } = curr
        const existingFee = acc[type] || {
          label: curr.type === OrderType.PCS_BRIDGE ? t('Bridge Fee') : t('Trading Fee'),
          amount: new BigNumber(0),
          hasDynamicFee: false,
        }

        // eslint-disable-next-line no-param-reassign
        acc[type] = {
          ...existingFee,
          amount: existingFee.amount.plus(currencyUsdPrices[index] || 0),
          hasDynamicFee: Boolean(existingFee.hasDynamicFee || curr.hasDynamicFee),
        }

        return acc
      }, {} as Record<OrderType, DisplayFee>)
  }, [currencyUsdPrices, priceBreakdown, t])

  return (
    <SwapUIV2.Collapse
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      title={
        <RowBetween>
          <RowFixed>
            <QuestionHelperV2 text={<TotalFeeToolTip />} placement="top">
              <DetailsTitle fontSize="14px" color="textSubtle">
                {t('Total Fee')}
              </DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <SkeletonV2
            width="70px"
            height="16px"
            borderRadius="8px"
            minHeight="auto"
            isDataReady={lpFeeAmounts.length > 0}
          >
            <Text fontSize="14px" textAlign="right">
              {priceBreakdown.some((p) => p.type === OrderType.PCS_CLASSIC) ? '~' : ''}
              {formatDollarAmount(
                currencyUsdPrices.reduce((acc, curr) => acc.plus(curr), new BigNumber(0)).toNumber(),
                3,
              )}
            </Text>
          </SkeletonV2>
        </RowBetween>
      }
      content={
        <LightGreyCard mt="4px" padding="8px 16px">
          {/** display grouped fees */}
          {Object.values(groupedFees).map((fee, index) => {
            const type = Object.keys(groupedFees)[index]

            return (
              <RowBetween key={fee.label}>
                <QuestionHelperV2
                  text={type === OrderType.PCS_BRIDGE ? <BridgeFeeToolTip /> : <TradingFeeToolTip />}
                  placement="top"
                >
                  <DetailsTitle fontSize="14px" color="textSubtle">
                    {fee.label}
                  </DetailsTitle>
                </QuestionHelperV2>
                <Text fontSize="14px" textAlign="right">
                  {`${
                    // if key of groupedFees is OrderType.PCS_CLASSIC, then it's a dynamic fee
                    type === OrderType.PCS_CLASSIC ? '~' : ''
                  }${formatDollarAmount(fee.amount.toNumber(), 3)}`}
                </Text>
              </RowBetween>
            )
          })}
        </LightGreyCard>
      }
    />
  )
}

export const TradeSummary = memo(function TradeSummary({
  inputAmount,
  outputAmount,
  tradeType,
  slippageAdjustedAmounts,
  isX = false,
  loading = false,
  hasDynamicHook,
  priceBreakdown,
  expectedFillTimeSec,
}: {
  expectedFillTimeSec?: number
  priceBreakdown: BridgeOrderFee[] | TradePriceBreakdown
  hasStablePair?: boolean
  inputAmount?: CurrencyAmount<Currency>
  outputAmount?: CurrencyAmount<Currency>
  tradeType?: TradeType
  slippageAdjustedAmounts: SlippageAdjustedAmounts
  isX?: boolean
  loading?: boolean
  hasDynamicHook?: boolean
}) {
  const { t } = useTranslation()
  const isExactIn = tradeType === TradeType.EXACT_INPUT
  const { feeSavedAmount, feeSavedUsdValue } = useFeeSaved(inputAmount, outputAmount)

  // if priceBreakdown is an array and priceBreakdown only has one item, hide the slippage button because it's bridge-only case
  const isBridgeOnlyCase = useMemo(() => {
    return Array.isArray(priceBreakdown) && priceBreakdown.length === 1
  }, [priceBreakdown])

  return (
    <AutoColumn px="4px">
      <RowBetween>
        <RowFixed>
          <QuestionHelperV2
            text={
              isExactIn
                ? t('Amount you are guaranteed to receive.')
                : t(
                    'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
                  )
            }
            placement="top"
          >
            <DetailsTitle>{isExactIn ? t('Minimum received') : t('Maximum sold')}</DetailsTitle>
          </QuestionHelperV2>
        </RowFixed>
        <RowFixed>
          <SkeletonV2 width="80px" height="16px" borderRadius="8px" minHeight="auto" isDataReady={!loading}>
            <Text fontSize="14px">
              {isExactIn
                ? `${formatAmount(slippageAdjustedAmounts[Field.OUTPUT], 4) ?? '-'} ${outputAmount?.currency?.symbol}`
                : `${formatAmount(slippageAdjustedAmounts[Field.INPUT], 4) ?? '-'} ${inputAmount?.currency?.symbol}`}
            </Text>
          </SkeletonV2>
        </RowFixed>
      </RowBetween>
      {feeSavedAmount ? (
        <RowBetween align="flex-start" mt="10px">
          <RowFixed>
            <QuestionHelperV2
              text={
                <>
                  <Text>{t('Fees saved on PancakeSwap compared to major DEXs charging interface fees.')}</Text>
                </>
              }
              placement="top"
            >
              <DetailsTitle>{t('Fee saved')}</DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <SkeletonV2 width="100px" height="16px" borderRadius="8px" minHeight="auto" isDataReady={!loading}>
            <RowFixed>
              <NumberDisplay
                as="span"
                fontSize={14}
                value={formatAmount(feeSavedAmount, 2)}
                suffix={` ${outputAmount?.currency?.symbol}`}
                color="positive60"
              />
              <NumberDisplay
                as="span"
                fontSize={14}
                color="positive60"
                value={formatFraction(feeSavedUsdValue, 2)}
                prefix="(~$"
                suffix=")"
                ml={1}
              />
            </RowFixed>
          </SkeletonV2>
        </RowBetween>
      ) : null}
      {priceBreakdown && (
        <RowBetween mt="10px">
          <RowFixed>
            <QuestionHelperV2
              text={
                <>
                  <Text>{t('The change in pool price caused by your swap.')}</Text>
                </>
              }
              placement="top"
            >
              <DetailsTitle>{t('Price Impact')}</DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <SkeletonV2 width="50px" height="16px" borderRadius="8px" minHeight="auto" isDataReady={!loading}>
            {isX ? (
              <Text color="primary">0%</Text>
            ) : (
              <FormattedPriceImpact priceImpact={getBridgeOrderPriceImpact(priceBreakdown)} />
            )}
          </SkeletonV2>
        </RowBetween>
      )}
      {!isBridgeOnlyCase && (
        <RowBetween mt="8px">
          <RowFixed>
            <QuestionHelperV2
              text={
                <>
                  <Text>
                    {t(
                      'Permissible price deviation (%) between quoted and execution price of swap. For cross-chain swaps, this applies separately to both source and destination chains.',
                    )}
                  </Text>
                </>
              }
              placement="top"
            >
              <DetailsTitle>{t('Slippage Tolerance')}</DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <SlippageButton enableAutoSlippage />
        </RowBetween>
      )}

      {Array.isArray(priceBreakdown) ? (
        <Box mt="10px">
          <BridgeTradingViewSection priceBreakdown={priceBreakdown} />
        </Box>
      ) : priceBreakdown?.lpFeeAmount || isX ? (
        <RowBetween mt="10px">
          <RowFixed>
            <QuestionHelperV2
              text={
                <>
                  <Text mb="12px">
                    <Text bold display="inline-block">
                      {t('AMM')}
                    </Text>
                    : {t('Trading fee varies by pool fee tier. Check it via the magnifier icon under "Route."')}
                  </Text>
                  <Text mt="12px">
                    <Link
                      style={{ display: 'inline' }}
                      ml="4px"
                      external
                      href="https://docs.pancakeswap.finance/products/pancakeswap-exchange/faq#what-will-be-the-trading-fee-breakdown-for-v3-exchange"
                    >
                      {t('Fee Breakdown and Tokenomics')}
                    </Link>
                  </Text>
                  <Text mt="10px">
                    <Text bold display="inline-block">
                      {t('X')}
                    </Text>
                    : {t('No fee when trading through PancakeSwap X (subject to change).')}
                  </Text>
                </>
              }
              placement="top"
            >
              <DetailsTitle fontSize="14px" color="textSubtle">
                {t('Trading Fee')}
              </DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <SkeletonV2 width="70px" height="16px" borderRadius="8px" minHeight="auto" isDataReady={!loading}>
            {isX ? (
              <Text color="primary" fontSize="14px">
                0 {inputAmount?.currency?.symbol}
              </Text>
            ) : hasDynamicHook ? (
              <QuestionHelperV2 text={t('This route uses a dynamic fee pool; actual fees may vary.')}>
                <Text fontSize="14px" style={{ textDecoration: 'underline dotted', cursor: 'help' }}>{`~${formatAmount(
                  priceBreakdown.lpFeeAmount,
                  4,
                )} ${inputAmount?.currency?.symbol}`}</Text>
              </QuestionHelperV2>
            ) : (
              <Text fontSize="14px">{`${formatAmount(priceBreakdown.lpFeeAmount, 4)} ${
                inputAmount?.currency?.symbol
              }`}</Text>
            )}
          </SkeletonV2>
        </RowBetween>
      ) : null}

      {expectedFillTimeSec && (
        <RowBetween mt="10px">
          <RowFixed>
            <QuestionHelperV2 text={t('Estimated time to complete this transaction.')}>
              <DetailsTitle fontSize="14px" color="textSubtle">
                {t('Est. Time')}
              </DetailsTitle>
            </QuestionHelperV2>
          </RowFixed>
          <Text fontSize="14px" textAlign="right">
            <EstimatedTime expectedFillTimeSec={expectedFillTimeSec} />
          </Text>
        </RowBetween>
      )}
    </AutoColumn>
  )
})

export interface AdvancedSwapDetailsProps {
  hasStablePair?: boolean
  pairs?: Pair[]
  path?: Currency[]
  priceImpactWithoutFee?: Percent
  realizedLPFee?: CurrencyAmount<Currency> | null
  slippageAdjustedAmounts: SlippageAdjustedAmounts
  inputAmount?: CurrencyAmount<Currency>
  outputAmount?: CurrencyAmount<Currency>
  tradeType?: TradeType
}
