import { Pair } from '@pancakeswap/sdk'
import { Box, Breadcrumbs, Container, FlexGap, Text } from '@pancakeswap/uikit'

import { FeeAmount, Pool } from '@pancakeswap/v3-sdk'
import React, { useCallback, useEffect, useMemo } from 'react'

import { useRouter } from 'next/router'
import { useV3FarmAPI } from 'hooks/useV3FarmAPI'

import { atom, useAtom } from 'jotai'
import { styled } from 'styled-components'

import { useFeeTierDistribution } from 'hooks/v3/useFeeTierDistribution'
import { NextLinkFromReactRouter } from '@pancakeswap/widgets-internal'
import { useTranslation } from '@pancakeswap/localization'
import { getPoolDetailPageLink } from 'utils/getPoolLink'
import { useQuery } from '@tanstack/react-query'

import { usePreviousValue } from '@pancakeswap/hooks'
import { useCurrency } from 'hooks/Tokens'
import AddLiquidity from 'views/AddLiquidity'
import AddStableLiquidity from 'views/AddLiquidity/AddStableLiquidity'
import useWarningLiquidity from 'views/AddLiquidity/hooks/useWarningLiquidity'
import useStableConfig, { StableConfigContext } from 'views/Swap/hooks/useStableConfig'

import { useActiveChainId } from 'hooks/useActiveChainId'
import { usePoolInfo } from 'state/farmsV4/state/extendPools/hooks'
import { resetMintState } from 'state/mint/actions'
import { useAddLiquidityV2FormDispatch } from 'state/mint/reducer'
import { PoolInfoHeader } from 'components/PoolInfoHeader'

import StableFormView from './formViews/StableFormView'
import V2FormView from './formViews/V2FormView'
import V3FormView from './formViews/V3FormView'
import { useCurrencyParams } from './hooks/useCurrencyParams'
import { SELECTOR_TYPE } from './types'

import { AprCalculatorV2 } from './components/AprCalculatorV2'
import { useHeaderInvertCurrencies } from './hooks/useHeaderInvertCurrencies'

const LinkText = styled(Text)`
  color: ${({ theme }) => theme.colors.primary60};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`

/* two-column layout where DepositAmount is moved at the very end on mobile. */
export const ResponsiveTwoColumns = styled.div<{ $singleColumn?: boolean }>`
  display: grid;
  grid-column-gap: 32px;
  grid-row-gap: 16px;
  grid-template-columns: 1fr;

  grid-template-rows: max-content;
  grid-auto-flow: row;

  ${({ theme }) => theme.mediaQueries.md} {
    grid-template-columns: ${({ $singleColumn }) => ($singleColumn ? '1fr' : '3fr 2fr')};
  }
`

const selectTypeAtom = atom(SELECTOR_TYPE.V3)

interface UniversalAddLiquidityPropsType {
  currencyIdA?: string
  currencyIdB?: string
  preferredSelectType?: SELECTOR_TYPE
  preferredFeeAmount?: FeeAmount
}

export function UniversalAddLiquidity({
  currencyIdA,
  currencyIdB,
  preferredSelectType,
  preferredFeeAmount,
}: UniversalAddLiquidityPropsType) {
  const dispatch = useAddLiquidityV2FormDispatch()

  useEffect(() => {
    if (!currencyIdA && !currencyIdB) {
      dispatch(resetMintState())
    }
  }, [dispatch, currencyIdA, currencyIdB])

  const router = useRouter()
  const baseCurrency = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)
  useWarningLiquidity(currencyIdA, currencyIdB)

  const stableConfig = useStableConfig({
    tokenA: baseCurrency,
    tokenB: currencyB,
  })

  const quoteCurrency =
    baseCurrency && currencyB && baseCurrency.wrapped.equals(currencyB.wrapped) ? undefined : currencyB

  const [, , feeAmountFromUrl] = router.query.currency || []

  // fee selection from url
  const feeAmount: FeeAmount | undefined = useMemo(() => {
    return (
      preferredFeeAmount ||
      (feeAmountFromUrl && Object.values(FeeAmount).includes(parseFloat(feeAmountFromUrl))
        ? parseFloat(feeAmountFromUrl)
        : undefined)
    )
  }, [preferredFeeAmount, feeAmountFromUrl])

  const [selectorType, setSelectorType] = useAtom(selectTypeAtom)

  const prevPreferredSelectType = usePreviousValue(preferredSelectType)

  useEffect(() => {
    if (!currencyIdA || !currencyIdB) return

    if (selectorType === SELECTOR_TYPE.V3 && preferredSelectType === SELECTOR_TYPE.V3) {
      return
    }

    if (preferredSelectType === SELECTOR_TYPE.STABLE && stableConfig.stableSwapConfig) {
      setSelectorType(SELECTOR_TYPE.STABLE)
    } else {
      setSelectorType(preferredSelectType || SELECTOR_TYPE.V3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currencyIdA,
    currencyIdB,
    feeAmountFromUrl,
    preferredSelectType,
    prevPreferredSelectType,
    setSelectorType,
    stableConfig.stableSwapConfig,
  ])

  return (
    <>
      <Box mt="24px">
        <ResponsiveTwoColumns
          $singleColumn={selectorType === SELECTOR_TYPE.V2 || selectorType === SELECTOR_TYPE.STABLE}
        >
          {selectorType === SELECTOR_TYPE.V3 && (
            <V3FormView
              feeAmount={feeAmount}
              baseCurrency={baseCurrency}
              quoteCurrency={quoteCurrency}
              currencyIdA={currencyIdA}
              currencyIdB={currencyIdB}
            />
          )}
          {selectorType === SELECTOR_TYPE.V2 && (
            <AddLiquidity currencyA={baseCurrency} currencyB={quoteCurrency}>
              {(props) => <V2FormView {...props} />}
            </AddLiquidity>
          )}
          {selectorType === SELECTOR_TYPE.STABLE && (
            <StableConfigContext.Provider value={stableConfig}>
              <AddStableLiquidity currencyA={baseCurrency} currencyB={quoteCurrency}>
                {(props) => (
                  <StableFormView {...props} stableTotalFee={stableConfig?.stableSwapConfig?.stableTotalFee} />
                )}
              </AddStableLiquidity>
            </StableConfigContext.Provider>
          )}
        </ResponsiveTwoColumns>
      </Box>
    </>
  )
}

export function AddLiquidityV3Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { chainId } = useActiveChainId()
  const router = useRouter()

  const [selectType] = useAtom(selectTypeAtom)
  const { currencyIdA, currencyIdB, feeAmount } = useCurrencyParams()

  const baseCurrency = useCurrency(currencyIdA)
  const quoteCurrency = useCurrency(currencyIdB)

  const stableConfig = useStableConfig({
    tokenA: baseCurrency,
    tokenB: quoteCurrency,
  })

  // V3 Pool Farm Config
  const { farms: farmV3Config } = useV3FarmAPI(chainId)

  const farmV3 = useMemo(() => {
    if (baseCurrency && quoteCurrency) {
      const [tokenA, tokenB] = [baseCurrency.wrapped, quoteCurrency.wrapped]
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return farmV3Config?.find((f) => f.token.equals(token0) && f.quoteToken.equals(token1))
    }
    return null
  }, [baseCurrency, quoteCurrency, farmV3Config])

  // Fetch latest fee tier for V3 pool
  const { largestUsageFeeTier } = useFeeTierDistribution(baseCurrency, quoteCurrency)

  const poolAddress = useMemo(
    () =>
      baseCurrency?.wrapped && quoteCurrency?.wrapped
        ? selectType === SELECTOR_TYPE.V3
          ? feeAmount
            ? Pool.getAddress(baseCurrency.wrapped, quoteCurrency.wrapped, feeAmount)
            : farmV3
            ? Pool.getAddress(baseCurrency.wrapped, quoteCurrency.wrapped, farmV3.feeAmount)
            : largestUsageFeeTier
            ? Pool.getAddress(baseCurrency.wrapped, quoteCurrency.wrapped, largestUsageFeeTier)
            : undefined
          : selectType === SELECTOR_TYPE.V2
          ? Pair.getAddress(baseCurrency.wrapped, quoteCurrency.wrapped)
          : selectType === SELECTOR_TYPE.STABLE
          ? stableConfig.stableSwapConfig?.stableSwapAddress
          : undefined
        : undefined,
    [
      baseCurrency?.wrapped,
      feeAmount,
      quoteCurrency?.wrapped,
      selectType,
      stableConfig.stableSwapConfig,
      largestUsageFeeTier,
      farmV3,
    ],
  )

  const pool = usePoolInfo({ poolAddress, chainId })

  const inverted = useMemo(
    () =>
      Boolean(
        pool?.token0 &&
          pool?.token1 &&
          pool?.token0?.wrapped.address !== pool?.token1?.wrapped.address &&
          pool?.token0?.wrapped.address !== baseCurrency?.wrapped.address,
      ),
    [pool, baseCurrency],
  )

  const { handleInvertCurrencies } = useHeaderInvertCurrencies({ currencyIdA, currencyIdB, feeAmount })

  const { data: poolDetailLink } = useQuery({
    queryKey: ['poolDetailLink', chainId, pool],
    queryFn: () => {
      if (chainId && pool) {
        return getPoolDetailPageLink(pool)
      }
      return null
    },
    enabled: !!chainId && !!pool,
  })

  return (
    <Container mx="auto" my="24px" maxWidth="1200px">
      <Box mb="24px">
        <Breadcrumbs>
          <NextLinkFromReactRouter to="/liquidity/pools">
            <LinkText>{t('Farms')}</LinkText>
          </NextLinkFromReactRouter>
          {chainId && pool && poolDetailLink && (
            <NextLinkFromReactRouter to={poolDetailLink}>
              <LinkText>{t('Pool Detail')}</LinkText>
            </NextLinkFromReactRouter>
          )}
          <FlexGap alignItems="center" gap="4px">
            <Text>{t('Add Liquidity')}</Text>
          </FlexGap>
        </Breadcrumbs>
      </Box>
      <PoolInfoHeader
        linkType="addLiquidity"
        poolInfo={pool}
        chainId={chainId}
        currency0={pool?.token0 ?? baseCurrency ?? undefined}
        currency1={pool?.token1 ?? quoteCurrency ?? undefined}
        isInverted={inverted}
        onInvertPrices={handleInvertCurrencies}
        poolId={poolAddress}
        overrideAprDisplay={
          selectType === SELECTOR_TYPE.V3
            ? {
                aprDisplay: (
                  <AprCalculatorV2
                    pool={pool}
                    inverted={inverted}
                    showTitle={false}
                    derived
                    showApyButton={false}
                    fontSize="24px"
                  />
                ),
                roiCalculator: (
                  <AprCalculatorV2
                    pool={pool}
                    inverted={inverted}
                    showTitle={false}
                    derived
                    showApyText={false}
                    fontSize="24px"
                  />
                ),
              }
            : undefined
        }
      />
      {children}
    </Container>
  )
}
