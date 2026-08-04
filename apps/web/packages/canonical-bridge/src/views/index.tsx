import { useTranslation } from '@pancakeswap/localization'
import { Flex, useToast } from '@pancakeswap/uikit'
import { useCallback, useEffect, useMemo } from 'react'

import {
  BridgeRoutes,
  BridgeTransfer,
  CanonicalBridgeProvider,
  CanonicalBridgeProviderProps,
  // EventData,
  // EventName,
  IChainConfig,
  ICustomizedBridgeConfig,
} from '@bnb-chain/canonical-bridge-widget'
import { useTheme } from 'styled-components'
import { useAccount } from 'wagmi'
import { RefreshingIcon } from '../components/RefreshingIcon'
import { V1BridgeLink } from '../components/V1BridgeLink'
import { chains, env } from '../configs'
import { useTransferConfig } from '../hooks/useTransferConfig'
import { locales } from '../modules/i18n/locales'
import { BridgeWalletProvider } from '../modules/wallet/BridgeWalletProvider'
import { breakpoints } from '../theme/breakpoints'
import { dark } from '../theme/dark'
import { light } from '../theme/light'
import GlobalStyle from './GlobalStyle'

export interface CanonicalBridgeProps {
  connectWalletButton: CanonicalBridgeProviderProps['config']['connectWalletButton']
  supportedChainIds: number[]
  rpcConfig: Record<number, string[]>
  disabledToChains?: number[]
}

function useDisableToChains(disabledToChainIds?: number[]) {
  useEffect(() => {
    if (!disabledToChainIds || disabledToChainIds.length === 0) return undefined

    const chainNamesToDisable = disabledToChainIds
      .map((id) => chains.find((c) => c.id === id)?.name?.toLowerCase())
      .filter(Boolean) as string[]

    const hideToChains = () => {
      const items = document.querySelectorAll('.bccb-widget-to-network-virtual-list .bccb-widget-to-network-list-item')
      items.forEach((item) => {
        const nameElement = item.querySelector('p.chakra-text')
        const name = nameElement?.textContent?.toLowerCase()
        if (name && chainNamesToDisable.includes(name)) {
          item.remove()
        }
      })
    }

    const disableExchangeIconIfNeeded = () => {
      const exchangeIcon = document.querySelector('.bccb-widget-exchange-chain-icon') as HTMLElement | null

      if (exchangeIcon) {
        const fromChainElement = document.querySelector(
          '.bccb-widget-network-from .bccb-widget-network-button p.chakra-text',
        )
        const fromChainName = fromChainElement?.textContent?.toLowerCase()

        if (fromChainName && chainNamesToDisable.includes(fromChainName)) {
          exchangeIcon.style.pointerEvents = 'none'
          exchangeIcon.style.opacity = '0.4'
          exchangeIcon.style.cursor = 'not-allowed'
        } else {
          exchangeIcon.style.pointerEvents = ''
          exchangeIcon.style.opacity = ''
          exchangeIcon.style.cursor = ''
        }
      }
    }

    hideToChains()
    disableExchangeIconIfNeeded()

    const observer = new MutationObserver(() => {
      hideToChains()
      disableExchangeIconIfNeeded()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [disabledToChainIds])
}

export const CanonicalBridge = (props: CanonicalBridgeProps) => {
  const { connectWalletButton, supportedChainIds, disabledToChains } = props
  useDisableToChains(disabledToChains)

  const { currentLanguage } = useTranslation()
  const theme = useTheme()
  const toast = useToast()
  const { connector } = useAccount()
  const supportedChains = useMemo<IChainConfig[]>(() => {
    return chains
      .filter((e) => supportedChainIds.includes(e.id))
      .filter((e) => !(connector?.id === 'BinanceW3WSDK' && e.id === 1101))
      .map((chain) => ({
        ...chain,
        rpcUrls: { default: { http: props.rpcConfig?.[chain.id] ?? chain.rpcUrls.default.http } },
      }))
  }, [supportedChainIds, connector?.id, props.rpcConfig])
  const transferConfig = useTransferConfig(supportedChains)
  const handleError = useCallback(
    (params: { type: string; message?: string | undefined; error?: Error | undefined }) => {
      if (params.message) {
        toast.toastError(params.message)
      }
    },
    [toast],
  )

  // const gtmListener = createGTMEventListener()

  const config = useMemo<ICustomizedBridgeConfig>(
    () => ({
      appName: 'canonical-bridge',
      assetPrefix: env.ASSET_PREFIX,
      bridgeTitle: 'Bridge',
      theme: {
        colorMode: theme.isDark ? 'dark' : 'light',
        breakpoints,
        colors: {
          dark,
          light,
        },
      },
      locale: {
        language: currentLanguage.code,
        messages: locales[currentLanguage.code] ?? locales.en,
      },
      http: {
        apiTimeOut: 30 * 1000,
        serverEndpoint: env.SERVER_ENDPOINT,
        deBridgeReferralCode: '31958',
      },
      transfer: transferConfig,
      components: {
        connectWalletButton,
        refreshingIcon: <RefreshingIcon />,
      },

      // analytics: {
      //   enabled: true,
      //   onEvent: (eventName: EventName, eventData: EventData<EventName>) => {
      //     gtmListener(eventName, eventData)
      //   },
      // },

      chains: supportedChains,
      onError: handleError,
    }),
    [currentLanguage.code, theme.isDark, transferConfig, supportedChains, handleError, connectWalletButton],
  )

  return (
    <BridgeWalletProvider>
      <GlobalStyle />
      <CanonicalBridgeProvider config={config}>
        <Flex flexDirection="column" justifyContent="center" maxWidth="480px" width="100%">
          <BridgeTransfer />
          <V1BridgeLink />
        </Flex>
        <BridgeRoutes />
      </CanonicalBridgeProvider>
    </BridgeWalletProvider>
  )
}
