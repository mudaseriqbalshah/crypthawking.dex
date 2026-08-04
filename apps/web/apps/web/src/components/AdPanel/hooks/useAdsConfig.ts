import { ContextApi, useTranslation } from '@pancakeswap/localization'
import { useMatchBreakpoints } from '@pancakeswap/uikit'
import { useMemo } from 'react'
import { AdsCampaignConfig } from '../types'

export enum AdsIds {
  PANCAKE_SOCIAL_LOGIN = 'pancake-social-login',
  PANCAKE_GIFT = 'pancake-gift',
  BINANCE_ALPHA = 'binance-alpha',
  BINANCE_ALPHA_V2 = 'binance-alpha-v2',
  SOLANA_LIQUIDITY = 'solana-liquidity',
}

type AdsConfigMap = {
  [key in AdsIds]: AdsCampaignConfig
}
// CryptoHawking testnet: all upstream PancakeSwap promotional ad campaigns (social login,
// Pancake Gifts, Binance Alpha trading competitions, Solana liquidity) reference products
// and features that do not exist on this fork, so the ad panel is disabled entirely rather
// than rebranding copy for campaigns that aren't real here. See RISKS.md.
const getAdsConfigs = (_t: ContextApi['t'], _isMobile: boolean): AdsCampaignConfig[] => {
  return []
}

export const useAdsConfigs = (): AdsConfigMap => {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()

  const AdsConfigs: AdsConfigMap = useMemo(
    () =>
      getAdsConfigs(t, isMobile).reduce((acc, config) => {
        // eslint-disable-next-line no-param-reassign
        acc[config.id] = config
        return acc
      }, {} as AdsConfigMap),
    [t, isMobile],
  )

  return AdsConfigs
}

export const useAdsConfig = (id: AdsIds) => {
  const configs = useAdsConfigs()
  return configs[id]
}
