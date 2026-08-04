import { useMatchBreakpoints } from '@pancakeswap/uikit'
import { useTradingCompetitionAds } from 'components/AdPanel/Ads/AdTradingCompetition'
import { AdsIds, useAdsConfigs } from 'components/AdPanel/hooks/useAdsConfig'
import { useMemo } from 'react'
import { AdCommon } from './Ads/AdCommon'
import { AdCrossChain } from './Ads/AdCrossChain'
import { AdIfo } from './Ads/AdIfo'
import { AdPCSX } from './Ads/AdPCSX'
import { AdSolana } from './Ads/AdSolana'
import { AdSpringboard } from './Ads/AdSpringboard'
import { commonLayoutWhitelistedPages } from './constants'
import { ExpandableAd } from './Expandable/ExpandableAd'
import { shouldRenderOnPages } from './renderConditions'
import { AdSlide, Priority } from './types'
import { useShouldRenderAdIfo } from './useShouldRenderAdIfo'

const JULY_13_2025_TIMESTAMP = 1752364800000

export const useAdConfig = () => {
  const { isDesktop } = useMatchBreakpoints()
  const shouldRenderOnPage = useMemo(() => {
    const shouldRender = shouldRenderOnPages(commonLayoutWhitelistedPages)
    if (!shouldRender) return false

    const shouldIncludeIsDesktop = Date.now() < JULY_13_2025_TIMESTAMP
    return shouldIncludeIsDesktop ? isDesktop : true
  }, [isDesktop])
  const MAX_ADS = isDesktop ? 6 : 4
  const shouldRenderAdIfo = useShouldRenderAdIfo()
  const configs = useAdsConfigs()
  const tradingCompetitionAds = useTradingCompetitionAds()
  const commonAdConfigs = useMemo(() => {
    return Object.entries(configs)
      .map(([key, value]) => {
        if (value.ad) {
          return {
            id: value.id,
            component: <AdCommon id={key as AdsIds} />,
            priority: value.priority || undefined,
          }
        }
        return undefined
      })
      .filter(Boolean) as { id: string; component: JSX.Element; priority?: number }[]
  }, [configs])

  const adList: Array<AdSlide> = useMemo(
    () => [
      {
        id: 'expandable-ad',
        component: <ExpandableAd />,
        priority: Priority.FIRST_AD,
        shouldRender: [shouldRenderOnPage],
      },
      {
        id: 'ad-cross-chain',
        component: <AdCrossChain />,
      },
      ...commonAdConfigs,
      {
        id: 'ad-solana',
        component: <AdSolana />,
      },
      {
        id: 'ad-springboard',
        component: <AdSpringboard />,
      },
      ...tradingCompetitionAds,
      {
        id: 'ad-ifo',
        component: <AdIfo />,
        shouldRender: [shouldRenderAdIfo],
      },
      {
        id: 'pcsx',
        component: <AdPCSX />,
      },
    ],
    [shouldRenderOnPage, shouldRenderAdIfo, commonAdConfigs, tradingCompetitionAds],
  )

  return useMemo(
    () =>
      adList
        .filter((ad) => ad.shouldRender === undefined || ad.shouldRender.every(Boolean))
        .sort((a, b) => (b.priority || Priority.VERY_LOW) - (a.priority || Priority.VERY_LOW))
        .slice(0, MAX_ADS),
    [adList, MAX_ADS],
  )
}

// Array of strings or regex patterns
const commonLayoutAdIgnoredPages = [
  '/home',
  '/cake-staking',
  // Route matching: /liquidity/pool/<chainName>/<poolAddress>
  /\/liquidity\/pool\/\w+\/\w+/,
]

/**
 *  On the pages mentioned, the Mobile ads will be placed directly in page instead of in the app layout.
 *  So don't render in the app layout.
 *  Contains strings or regex patterns.
 */
export const layoutMobileAdIgnoredPages = [
  ...commonLayoutAdIgnoredPages,
  '/',
  '/swap',
  '/prediction',
  '/liquidity/pools',
  '/migration/bcake',
]

/**
 *  On the pages mentioned, the Desktop ads will be placed directly in page instead of in the app layout.
 *  So don't render in the app layout.
 *  Contains strings or regex patterns.
 */
export const layoutDesktopAdIgnoredPages = [...commonLayoutAdIgnoredPages]
