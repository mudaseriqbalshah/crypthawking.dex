import { ContextApi } from '@pancakeswap/localization'
import {
  DropdownMenuItems,
  EarnFillIcon,
  EarnIcon,
  MenuItemsType,
  SwapFillIcon,
  SwapIcon,
  WaterIcon,
} from '@pancakeswap/uikit'
import { SUPPORT_FARMS } from 'config/constants/supportChains'

export type ConfigMenuDropDownItemsType = DropdownMenuItems & {
  hideSubNav?: boolean
  overrideSubNavItems?: DropdownMenuItems['items']
  matchHrefs?: string[]
}
export type ConfigMenuItemsType = Omit<MenuItemsType, 'items'> & {
  hideSubNav?: boolean
  image?: string
  items?: ConfigMenuDropDownItemsType[]
  overrideSubNavItems?: ConfigMenuDropDownItemsType[]
}

export const addMenuItemSupported = (item, chainId) => {
  if (!chainId || !item.supportChainIds) {
    return item
  }
  if (item.supportChainIds?.includes(chainId)) {
    return item
  }
  return {
    ...item,
    disabled: true,
  }
}

const config: (
  t: ContextApi['t'],
  isDark: boolean,
  languageCode?: string,
  chainId?: number,
) => ConfigMenuItemsType[] = (t, _isDark, _languageCode, chainId) =>
  [
    {
      label: t('Trade'),
      icon: SwapIcon,
      fillIcon: SwapFillIcon,
      href: '/swap',
      hideSubNav: true,
      items: [
        {
          label: t('Swap'),
          href: '/swap',
        },
      ].map((item) => addMenuItemSupported(item, chainId)),
    },
    {
      label: t('Earn'),
      href: '/liquidity/pools',
      icon: EarnIcon,
      fillIcon: EarnFillIcon,
      image: '/images/decorations/pe2.png',
      supportChainIds: SUPPORT_FARMS,
      overrideSubNavItems: [
        {
          label: t('Farms'),
          href: '/farms',
          supportChainIds: SUPPORT_FARMS,
        },
        {
          label: t('Liquidity'),
          href: '/liquidity/positions',
          supportChainIds: SUPPORT_FARMS,
        },
      ].map((item) => addMenuItemSupported(item, chainId)),
      items: [
        {
          label: t('Farms'),
          href: '/farms',
          matchHrefs: ['/farms'],
          supportChainIds: SUPPORT_FARMS,
        },
        {
          label: t('Liquidity'),
          href: '/liquidity/positions',
          matchHrefs: ['/liquidity/pools', '/liquidity/positions'],
          supportChainIds: SUPPORT_FARMS,
        },
      ].map((item) => addMenuItemSupported(item, chainId)),
    },
    {
      label: t('Faucet'),
      icon: WaterIcon,
      href: '/faucet',
      hideSubNav: true,
    },
  ].map((item) => addMenuItemSupported(item, chainId))

export default config
