import { ContextApi } from '@pancakeswap/localization'
import memoize from 'lodash/memoize'
import { PageMeta } from './types'

export const DEFAULT_META: PageMeta = {
  title: 'CryptoHawking DEX',
  description: 'Testnet DEX on Base Sepolia — swap, LP and farm valueless test tokens.',
  image: '/images/og-hero.png',
}

interface PathList {
  paths: { [path: string]: { title: string; basePath?: boolean; description?: string; image?: string } }
  defaultTitleSuffix: string
}

const getPathList = memoize((t: ContextApi['t']): PathList => {
  return {
    paths: {
      '/': { title: t('Home') },
      '/home': { title: t('Home') },
      '/swap': { basePath: true, title: t('Exchange'), image: '/images/og-hero.png' },
      '/limit-orders': { basePath: true, title: t('Limit Orders'), image: '/images/og-hero.png' },
      '/add': { basePath: true, title: t('Add Liquidity'), image: '/images/og-hero.png' },
      '/remove': { basePath: true, title: t('Remove Liquidity'), image: '/images/og-hero.png' },
      '/liquidity': { title: t('Liquidity'), image: '/images/og-hero.png' },
      '/find': { title: t('Import Pool') },
      '/liquidity/pools': { title: t('Earn from LP'), image: '/images/og-hero.png' },
      '/liquidity/positions': { title: t('My Positions'), image: '/images/og-hero.png' },
      '/liquidity/pool': {
        basePath: true,
        title: `${t('Pool Detail')}`,
        description: 'View statistics for CryptoHawking DEX pool.',
        image: '/images/og-hero.png',
      },
      '/pools': { title: t('Pools'), image: '/images/og-hero.png' },
      '/farms': { basePath: true, title: t('Farms'), image: '/images/og-hero.png' },
    },
    defaultTitleSuffix: t('CryptoHawking DEX'),
  }
})

export const getCustomMeta = memoize(
  (path: string, t: ContextApi['t'], _: string): PageMeta | null => {
    const pathList = getPathList(t)
    let pathMetadata = pathList.paths[path]
    if (!pathMetadata) {
      const basePath = Object.entries(pathList.paths).find(([url, data]) => data.basePath && path.startsWith(url))?.[0]
      if (basePath) {
        pathMetadata = pathList.paths[basePath]
      }
    }

    if (pathMetadata) {
      return {
        title: `${pathMetadata.title}`,
        ...(pathMetadata.description && { description: pathMetadata.description }),
        image: pathMetadata.image,
      }
    }
    return null
  },
  (path, _, locale) => `${path}#${locale}`,
)
