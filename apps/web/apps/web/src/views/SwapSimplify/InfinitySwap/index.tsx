import { SmartRouter } from '@pancakeswap/smart-router/evm'
import { FlexGap } from '@pancakeswap/uikit'
import { SwapUIV2 } from '@pancakeswap/widgets-internal'
import { useTokenRisk } from 'components/AccessRisk'
import { RiskDetailsPanel, useShouldRiskPanelDisplay } from 'components/AccessRisk/SwapRevampRiskDisplay'

import { GasTokenSelector } from 'components/Paymaster/GasTokenSelector'
import { useCurrency } from 'hooks/Tokens'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { useAutoSlippageWithFallback } from 'hooks/useAutoSlippageWithFallback'
import { usePaymaster } from 'hooks/usePaymaster'
import { useAllTypeBestTrade } from 'quoter/hook/useAllTypeBestTrade'
import { memo, Suspense, useMemo } from 'react'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'
import { MevSwapDetail } from 'views/Mev/MevSwapDetail'
import { MevToggle } from 'views/Mev/MevToggle'
import { SwapType } from '../../Swap/types'
import { useIsWrapping } from '../../Swap/V3Swap/hooks'
import { useBuyCryptoInfo } from '../hooks/useBuyCryptoInfo'
import { useIsPriceImpactTooHigh } from '../hooks/useIsPriceImpactTooHigh'
import { useUserInsufficientBalance } from '../hooks/useUserInsufficientBalance'
import { ButtonAndDetailsPanel } from './ButtonAndDetailsPanel'
import { BuyCryptoPanel } from './BuyCryptoPanel'
import { CommitButton } from './CommitButton'
import { FormMain } from './FormMainInfinity'
import { PricingAndSlippage } from './PricingAndSlippage'
import { RefreshButton } from './RefreshButton'
import { SwapSelection } from './SwapSelectionTab'
import { TradeDetails } from './TradeDetails'
import { TradingFee } from './TradingFee'

export const InfinitySwapForm = memo(() => {
  const { bestOrder, refreshOrder, tradeError, tradeLoaded, refreshDisabled, pauseQuoting, resumeQuoting } =
    useAllTypeBestTrade()

  const isWrapping = useIsWrapping()
  const { chainId: activeChianId } = useActiveChainId()
  const isUserInsufficientBalance = useUserInsufficientBalance(bestOrder)
  const { shouldShowBuyCrypto, buyCryptoLink } = useBuyCryptoInfo(bestOrder)

  const executionPrice = useMemo(
    () => (bestOrder?.trade ? SmartRouter.getExecutionPrice(bestOrder.trade) : undefined),
    [bestOrder?.trade],
  )
  const isPriceImpactTooHigh = useIsPriceImpactTooHigh(!tradeError ? bestOrder : undefined, !tradeLoaded)

  const commitHooks = useMemo(() => {
    return {
      beforeCommit: () => {
        pauseQuoting()
      },
      afterCommit: resumeQuoting,
    }
  }, [pauseQuoting, resumeQuoting])
  const {
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
  } = useSwapState()

  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)

  const { slippageTolerance: userSlippageTolerance } = useAutoSlippageWithFallback()
  const isSlippageTooHigh = useMemo(() => userSlippageTolerance > 500, [userSlippageTolerance])
  const shouldRiskPanelDisplay = useShouldRiskPanelDisplay(inputCurrency?.wrapped, outputCurrency?.wrapped)
  const token0Risk = useTokenRisk(inputCurrency?.wrapped)
  const token1Risk = useTokenRisk(outputCurrency?.wrapped)

  const { isPaymasterAvailable } = usePaymaster()

  return (
    <SwapUIV2.SwapFormWrapper>
      <SwapUIV2.SwapTabAndInputPanelWrapper>
        <SwapSelection swapType={SwapType.MARKET} withToolkit />
        <FormMain
          tradeLoading={!tradeLoaded}
          inputAmount={bestOrder?.trade?.inputAmount}
          outputAmount={bestOrder?.trade?.outputAmount}
          swapCommitButton={
            <CommitButton order={bestOrder} tradeLoaded={tradeLoaded} tradeError={tradeError} {...commitHooks} />
          }
          isUserInsufficientBalance={isUserInsufficientBalance}
        />
      </SwapUIV2.SwapTabAndInputPanelWrapper>
      {shouldShowBuyCrypto && <BuyCryptoPanel link={buyCryptoLink} />}
      {(shouldRiskPanelDisplay || isPriceImpactTooHigh || isSlippageTooHigh) && (
        <RiskDetailsPanel
          isPriceImpactTooHigh={isPriceImpactTooHigh}
          isSlippageTooHigh={isSlippageTooHigh}
          token0={inputCurrency?.wrapped}
          token1={outputCurrency?.wrapped}
          token0RiskLevelDescription={token0Risk.data?.riskLevelDescription}
          token1RiskLevelDescription={token1Risk.data?.riskLevelDescription}
        />
      )}
      <ButtonAndDetailsPanel
        swapCommitButton={
          <CommitButton order={bestOrder} tradeLoaded={tradeLoaded} tradeError={tradeError} {...commitHooks} />
        }
        mevSlot={<MevSwapDetail />}
        pricingAndSlippage={
          <Suspense>
            <>
              <FlexGap
                alignItems="center"
                flexWrap="wrap"
                justifyContent="space-between"
                width="calc(100% - 20px)"
                gap="8px"
              >
                <FlexGap
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <RefreshButton
                    onRefresh={refreshOrder}
                    refreshDisabled={refreshDisabled}
                    chainId={activeChianId}
                    loading={!tradeLoaded}
                  />
                  <PricingAndSlippage
                    priceLoading={!tradeLoaded}
                    price={executionPrice ?? undefined}
                    showSlippage={false}
                  />
                </FlexGap>
                <TradingFee loaded={tradeLoaded} order={bestOrder} />
              </FlexGap>
            </>
          </Suspense>
        }
        tradeDetails={
          <Suspense>
            <TradeDetails loaded={tradeLoaded} order={bestOrder} />
          </Suspense>
        }
        shouldRenderDetails={Boolean(executionPrice) && Boolean(bestOrder) && !isWrapping && !tradeError}
        mevToggleSlot={
          <Suspense>
            <MevToggle />
          </Suspense>
        }
        gasTokenSelector={
          isPaymasterAvailable && <GasTokenSelector mt="8px" inputCurrency={inputCurrency || undefined} />
        }
      />
    </SwapUIV2.SwapFormWrapper>
  )
})
