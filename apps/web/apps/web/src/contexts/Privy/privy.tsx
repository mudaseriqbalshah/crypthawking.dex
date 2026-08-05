'use client'

import { PrivyProvider as Provider } from '@privy-io/react-auth'
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets'
import { useRouter } from 'next/router'
import { PropsWithChildren } from 'react'

import { CHAINS } from 'config/chains'
import { useFirebaseAuth } from './firebase'

export function PrivyProvider({ children }: PropsWithChildren) {
  const { isLoading, getToken } = useFirebaseAuth()
  const router = useRouter()

  // CryptoHawking: Privy social login is intentionally unconfigured — we do not run a
  // Privy app and must not reuse PancakeSwap's. The provider still mounts (downstream
  // components call usePrivy unconditionally) but stays unauthenticated. An empty appId
  // throws during SSR prerender, so we fall back to a well-formed dummy id: Privy then
  // initializes but never reaches ready, which keeps social login inert while wagmi
  // wallet flows work. Replace with a real app id to enable social login (RISKS.md).

  // Show wallet UIs only on bridge pages
  const showWalletUIs = router.pathname.includes('/bridge')

  return (
    <Provider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'clcryptohawking0000dummy0'}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || 'client-dummy-cryptohawking'}
      config={{
        defaultChain: CHAINS[0],
        customAuth: {
          isLoading,
          getCustomAccessToken: getToken,
        },
        supportedChains: CHAINS,
        appearance: {
          accentColor: '#6A6FF5',
          theme: '#222224',
          showWalletLoginFirst: false,
          logo: 'https://auth.privy.io/logos/privy-logo-dark.png',
          walletChainType: 'ethereum-only',
          walletList: ['detected_wallets', 'metamask'],
        },
        fundingMethodConfig: {
          moonpay: {
            useSandbox: process.env.NODE_ENV !== 'production',
          },
        },
        embeddedWallets: {
          requireUserPasswordOnCreate: false, // we will trigger it by ourself when create wallet
          showWalletUIs,
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          solana: {
            createOnLogin: 'off',
          },
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
        externalWallets: {
          walletConnect: {
            enabled: false,
          },
        },
      }}
    >
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </Provider>
  )
}
