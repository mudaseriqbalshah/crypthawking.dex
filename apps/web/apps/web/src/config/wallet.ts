import { isCyberWallet } from '@cyberlab/cyber-app-sdk'
import { ChainId } from '@pancakeswap/chains'
import { WalletConfigV2, WalletIds } from '@pancakeswap/ui-wallets'
import { WalletFilledIcon } from '@pancakeswap/uikit'
import safeGetWindow from '@pancakeswap/utils/safeGetWindow'
import { getTrustWalletProvider } from '@pancakeswap/wagmi/connectors/trustWallet'
import type { ExtendEthereum } from 'global'
import { chains, createWagmiConfig, walletConnectNoQrCodeConnector } from 'utils/wagmi'
import { Config } from 'wagmi'
import { ConnectMutateAsync } from 'wagmi/query'
import { ASSET_CDN } from './constants/endpoints'

export enum ConnectorNames {
  MetaMask = 'metaMask',
  Injected = 'injected',
  WalletConnect = 'walletConnect',
  WalletConnectV1 = 'walletConnectLegacy',
  // BSC = 'bsc',
  BinanceW3W = 'BinanceW3WSDK',
  Blocto = 'blocto',
  WalletLink = 'coinbaseWalletSDK',
  // Ledger = 'ledger',
  TrustWallet = 'trust',
  CyberWallet = 'cyberWallet',
}

const createQrCode =
  <config extends Config = Config, context = unknown>(chainId: number, connect: ConnectMutateAsync<config, context>) =>
  async (connectedCb?: () => void) => {
    const wagmiConfig = createWagmiConfig()
    const injectedConnector = wagmiConfig.connectors.find((connector) => connector.id === ConnectorNames.Injected)
    if (!injectedConnector) {
      return ''
    }
    // HACK: utilizing event emitter from injected connector to notify wagmi of the connect events
    const connector = {
      ...walletConnectNoQrCodeConnector({
        chains,
        emitter: injectedConnector?.emitter,
      }),
      emitter: injectedConnector.emitter,
      uid: injectedConnector.uid,
    }
    const provider = await connector.getProvider()

    return new Promise<string>((resolve) => {
      provider.on('display_uri', (uri) => {
        resolve(uri)
      })
      if (connectedCb) {
        provider.on('connect', connectedCb)
      }
      connect({ connector, chainId })
    })
  }

const isMetamaskInstalled = () => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    if (window.ethereum?.isMetaMask) {
      // binance wallet doesn't support metamask
      // @ts-ignore
      return !window.ethereum?.isBinance
    }

    if (window.ethereum?.providers?.some((p) => p.isMetaMask)) {
      return true
    }
  } catch (e) {
    return false
  }

  return false
}

function isBinanceWeb3WalletInstalled() {
  try {
    return Boolean((safeGetWindow() as ExtendEthereum)?.isBinance)
  } catch (error) {
    console.error('Error checking Binance Web3 Wallet:', error)
    return false
  }
}

export const TOP_WALLET_MAP: { [chainId: number]: WalletIds[] } = {
  [ChainId.BSC]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx, WalletIds.BinanceW3W],
  [ChainId.BASE]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
  [ChainId.ARBITRUM_ONE]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
  [ChainId.ETHEREUM]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
  [ChainId.ZKSYNC]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
  [ChainId.LINEA]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
  [ChainId.OPBNB]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx, WalletIds.BinanceW3W],
  [ChainId.POLYGON_ZKEVM]: [WalletIds.Metamask, WalletIds.Trust, WalletIds.Okx],
}

export const walletsConfig = <config extends Config = Config, context = unknown>({
  chainId,
  connect,
}: {
  chainId: number
  connect: ConnectMutateAsync<config, context>
}): WalletConfigV2<ConnectorNames>[] => {
  const qrCode = createQrCode(chainId, connect)
  return [
    {
      id: WalletIds.Metamask,
      title: 'Metamask',
      icon: `${ASSET_CDN}/web/wallets/metamask.png`,
      get installed() {
        return isMetamaskInstalled()
        // && metaMaskConnector.ready
      },
      connectorId: ConnectorNames.MetaMask,
      deepLink: 'https://metamask.app.link/dapp/pancakeswap.finance/',
      qrCode,
      downloadLink: 'https://metamask.app.link/dapp/pancakeswap.finance/',
      MEVSupported: true,
    },
    {
      id: WalletIds.Trust,
      title: 'Trust Wallet',
      icon: `${ASSET_CDN}/web/wallets/trust.png`,
      connectorId: ConnectorNames.TrustWallet,
      get installed() {
        return !!getTrustWalletProvider()
      },
      deepLink: 'https://link.trustwallet.com/open_url?coin_id=20000714&url=https://pancakeswap.finance/',
      downloadLink: 'https://trustwallet.com/browser-extension',
      guide: {
        desktop: 'https://trustwallet.com/browser-extension',
        mobile: 'https://trustwallet.com/',
      },
      qrCode,
      MEVSupported: true,
    },
    {
      id: WalletIds.Okx,
      title: 'OKX Wallet',
      icon: `${ASSET_CDN}/web/wallets/okx-wallet.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean(safeGetWindow()?.okxwallet)
      },
      downloadLink: 'https://www.okx.com/download',
      deepLink:
        'https://www.okx.com/download?deeplink=okx%3A%2F%2Fwallet%2Fdapp%2Furl%3FdappUrl%3Dhttps%253A%252F%252Fpancakeswap.finance',
      guide: {
        desktop: 'https://www.okx.com/web3',
        mobile: 'https://www.okx.com/web3',
      },
      qrCode,
    },
    {
      id: WalletIds.BinanceW3W,
      title: 'Binance Wallet',
      icon: `${ASSET_CDN}/web/wallets/binance-w3w.png`,
      connectorId: isBinanceWeb3WalletInstalled() ? ConnectorNames.Injected : ConnectorNames.BinanceW3W,
      get installed() {
        if (isBinanceWeb3WalletInstalled()) {
          return true
        }
        // still showing the SDK if not installed
        return undefined
      },
      MEVSupported: true,
    },
    {
      id: WalletIds.Coinbase,
      title: 'Coinbase Wallet',
      icon: `${ASSET_CDN}/web/wallets/coinbase.png`,
      connectorId: ConnectorNames.WalletLink,
    },
    {
      id: WalletIds.Walletconnect,
      title: 'WalletConnect',
      icon: `${ASSET_CDN}/web/wallets/walletconnect.png`,
      connectorId: ConnectorNames.WalletConnect,
    },
    {
      id: WalletIds.Opera,
      title: 'Opera Wallet',
      icon: `${ASSET_CDN}/web/wallets/opera.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean(safeGetWindow()?.ethereum?.isOpera)
      },
      downloadLink: 'https://www.opera.com/crypto/next',
    },
    {
      id: WalletIds.Brave,
      title: 'Brave Wallet',
      icon: `${ASSET_CDN}/web/wallets/brave.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean(safeGetWindow()?.ethereum?.isBraveWallet)
      },
      downloadLink: 'https://brave.com/wallet/',
    },
    {
      id: WalletIds.Rabby,
      title: 'Rabby Wallet',
      icon: `${ASSET_CDN}/web/wallets/rabby.png`,
      get installed() {
        return Boolean(safeGetWindow()?.ethereum?.isRabby)
      },
      connectorId: ConnectorNames.Injected,
      guide: {
        desktop: 'https://rabby.io/',
      },
      downloadLink: {
        desktop: 'https://rabby.io/',
      },
      qrCode,
      MEVSupported: true,
    },
    {
      id: WalletIds.Math,
      title: 'MathWallet',
      icon: `${ASSET_CDN}/web/wallets/mathwallet.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean(safeGetWindow()?.ethereum?.isMathWallet)
      },
      qrCode,
    },
    {
      id: WalletIds.Tokenpocket,
      title: 'TokenPocket',
      icon: `${ASSET_CDN}/web/wallets/tokenpocket.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean(safeGetWindow()?.ethereum?.isTokenPocket) || Boolean(safeGetWindow()?.tokenpocket)
      },
      qrCode,
    },
    {
      id: WalletIds.Safepal,
      title: 'SafePal',
      icon: `${ASSET_CDN}/web/wallets/safepal.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean((safeGetWindow()?.ethereum as ExtendEthereum)?.isSafePal)
      },
      downloadLink: 'https://safepal.com/en/extension',
      qrCode,
    },
    {
      id: WalletIds.Coin98,
      title: 'Coin98',
      icon: `${ASSET_CDN}/web/wallets/coin98.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return Boolean((safeGetWindow()?.ethereum as ExtendEthereum)?.isCoin98) || Boolean(safeGetWindow()?.coin98)
      },
      qrCode,
    },
    {
      id: WalletIds.Blocto,
      title: 'Blocto',
      icon: `${ASSET_CDN}/web/wallets/blocto.png`,
      connectorId: ConnectorNames.Blocto,
      get installed() {
        try {
          return (safeGetWindow()?.ethereum as ExtendEthereum)?.isBlocto ? true : undefined // undefined to show SDK
        } catch (error) {
          console.error('Error checking Blocto installation:', error)
          return undefined
        }
      },
    },
    {
      id: WalletIds.Cyberwallet,
      title: 'CyberWallet',
      icon: `${ASSET_CDN}/web/wallets/cyberwallet.png`,
      connectorId: ConnectorNames.CyberWallet,
      get installed() {
        return Boolean(safeGetWindow() && isCyberWallet())
      },
      isNotExtension: true,
      guide: {
        desktop: 'https://docs.cyber.co/sdk/cyber-account#supported-chains',
      },
    },
    // {
    //   id: 'ledger',
    //   title: 'Ledger',
    //   icon: `${ASSET_CDN}/web/wallets/ledger.png`,
    //   connectorId: ConnectorNames.Ledger,
    // },
  ]
}

export const createWallets = <config extends Config = Config, context = unknown>(
  chainId: number,
  connect: ConnectMutateAsync<config, context>,
) => {
  const config = walletsConfig({ chainId, connect })
  const ethereum = safeGetWindow()?.ethereum
  const hasInjected = !!ethereum
  const injectedMeta = ethereum ? Object.keys(ethereum).filter((i) => i.match(/^is\w+/)) : []
  const injectedIsMetamask = injectedMeta.length === 1 && ethereum?.isMetaMask
  const injectedIsTrust = ethereum?.isTrust
  const currentInjectedWithinConfig =
    injectedIsMetamask ||
    injectedIsTrust ||
    config.some((c) => c.installed && ConnectorNames.Injected === c.connectorId)

  return !hasInjected || currentInjectedWithinConfig
    ? config
    : [
        ...config,
        // add injected icon if none of injected type wallets installed
        {
          id: WalletIds.Injected,
          title: 'Injected',
          icon: WalletFilledIcon,
          connectorId: ConnectorNames.Injected,
          installed: typeof window !== 'undefined' && Boolean(window.ethereum),
        },
      ]
}

const docLangCodeMapping: Record<string, string> = {
  it: 'italian',
  ja: 'japanese',
  fr: 'french',
  vi: 'vietnamese',
  id: 'indonesian',
  'zh-cn': 'chinese',
  'pt-br': 'portuguese-brazilian',
}

export const getDocLink = (code: string) =>
  docLangCodeMapping[code]
    ? `https://docs.pancakeswap.finance/v/${docLangCodeMapping[code]}/get-started/wallet-guide`
    : `https://docs.pancakeswap.finance/get-started/wallet-guide`

export const mevDocLink = 'https://docs.pancakeswap.finance/trading-tools/pancakeswap-mev-guard'
