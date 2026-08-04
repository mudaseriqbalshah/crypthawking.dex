import { ModalV2Props, SvgProps } from '@pancakeswap/uikit'

type LinkOfTextAndLink = string | { text: string; url: string }

type DeviceLink = {
  desktop?: LinkOfTextAndLink
  mobile?: LinkOfTextAndLink
}

export type LinkOfDevice = string | DeviceLink

export enum WalletIds {
  Injected = 'injected',
  Metamask = 'metamask',
  Trust = 'trust',
  Okx = 'okx',
  BinanceW3W = 'BinanceW3W',
  Coinbase = 'coinbase',
  Walletconnect = 'walletconnect',
  Opera = 'opera',
  Brave = 'brave',
  Rabby = 'rabby',
  Math = 'math',
  Tokenpocket = 'tokenpocket',
  Safepal = 'safepal',
  Coin98 = 'coin98',
  Blocto = 'blocto',
  Cyberwallet = 'cyberwallet',
  Petra = 'petra',
  Martian = 'martian',
  Pontem = 'pontem',
  Fewcha = 'fewcha',
  TrustWallet = 'trustWallet',
  SafePal = 'safePal',
  Rise = 'rise',
  Msafe = 'msafe',
}

export type WalletConfigV2<T = unknown> = {
  id: WalletIds
  title: string
  icon: string | React.FC<React.PropsWithChildren<SvgProps>>
  connectorId: T
  deepLink?: string
  installed?: boolean
  guide?: LinkOfDevice
  downloadLink?: LinkOfDevice
  mobileOnly?: boolean
  qrCode?: (cb?: () => void) => Promise<string>
  isNotExtension?: boolean
  MEVSupported?: boolean
}

export type ConnectData = {
  accounts: readonly [string, ...string[]]
  chainId: number | string | undefined
}

export interface WalletModalV2Props<T = unknown> extends ModalV2Props {
  wallets: WalletConfigV2<T>[]
  topWallets: WalletConfigV2<T>[]
  login: (connectorID: T) => Promise<ConnectData | undefined>
  docLink: string
  docText: string
  mevDocLink: string | null
  onWalletConnectCallBack?: (walletTitle?: string, address?: string) => void
  fullSize?: boolean
  onGoogleLogin?: () => void
  onXLogin?: () => void
  onTelegramLogin?: () => void
  onDiscordLogin?: () => void
  onReopenWalletModal?: () => void
}
