import { isInBinance } from '@binance/w3w-utils'
import { LanguageProvider } from '@pancakeswap/localization'
import { DialogProvider, ModalProvider, UIKitProvider, dark, light } from '@pancakeswap/uikit'
import { Store } from '@reduxjs/toolkit'
import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HistoryManagerProvider } from 'contexts/HistoryContext'
import { privyEnabled } from 'contexts/Privy/enabled'
import { FirebaseAuthProvider } from 'contexts/Privy/firebase'
import { PrivyProvider } from 'contexts/Privy/privy'
import { WagmiWithPrivyProvider } from 'contexts/Privy/provider'
import { W3WConfigProvider } from 'contexts/W3WConfigContext'
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes'
import { useMemo } from 'react'
import { Provider } from 'react-redux'
import { WagmiProvider } from 'wagmi'
import { createWagmiConfig, createW3WWagmiConfig } from 'utils/wagmi'
// Create a client
const queryClient = new QueryClient()

const StyledUIKitProvider: React.FC<React.PropsWithChildren> = ({ children, ...props }) => {
  const { resolvedTheme } = useNextTheme()
  return (
    <UIKitProvider theme={resolvedTheme === 'dark' ? dark : light} {...props}>
      {children}
    </UIKitProvider>
  )
}

const Providers: React.FC<
  React.PropsWithChildren<{
    store: Store
    children: React.ReactNode
    dehydratedState: any
  }>
> = ({ children, store, dehydratedState }) => {
  const wagmiConfig = useMemo(() => createWagmiConfig(), [])

  const appTree = (
    <W3WConfigProvider value={isInBinance()}>
      <HydrationBoundary state={dehydratedState}>
        <Provider store={store}>
          <NextThemeProvider defaultTheme="dark">
            <LanguageProvider>
              <StyledUIKitProvider>
                <HistoryManagerProvider>
                  <ModalProvider portalProvider={DialogProvider}>{children}</ModalProvider>
                </HistoryManagerProvider>
              </StyledUIKitProvider>
            </LanguageProvider>
          </NextThemeProvider>
        </Provider>
      </HydrationBoundary>
    </W3WConfigProvider>
  )

  // CryptoHawking: social login is opt-in. Without NEXT_PUBLIC_PRIVY_APP_ID we mount neither
  // FirebaseAuthProvider nor the Privy provider tree, and use wagmi's own WagmiProvider — a
  // Privy provider pointed at an app id it cannot resolve throws in the production build and
  // takes the whole client render down. See contexts/Privy/enabled.ts.
  if (!privyEnabled) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider reconnectOnMount={false} config={wagmiConfig}>
          {appTree}
        </WagmiProvider>
      </QueryClientProvider>
    )
  }

  return (
    <FirebaseAuthProvider>
      <PrivyProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiWithPrivyProvider reconnectOnMount={false} config={wagmiConfig}>
            {appTree}
          </WagmiWithPrivyProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </FirebaseAuthProvider>
  )
}

// Test-only Provider that excludes PrivyProvider and FirebaseAuthProvider
export const TestProviders: React.FC<
  React.PropsWithChildren<{
    store: Store
    children: React.ReactNode
    dehydratedState: any
  }>
> = ({ children, store, dehydratedState }) => {
  const wagmiConfig = useMemo(() => createWagmiConfig(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <W3WConfigProvider value={false}>
          <HydrationBoundary state={dehydratedState}>
            <Provider store={store}>
              <NextThemeProvider defaultTheme="dark">
                <LanguageProvider>
                  <StyledUIKitProvider>
                    <HistoryManagerProvider>
                      <ModalProvider portalProvider={DialogProvider}>{children}</ModalProvider>
                    </HistoryManagerProvider>
                  </StyledUIKitProvider>
                </LanguageProvider>
              </NextThemeProvider>
            </Provider>
          </HydrationBoundary>
        </W3WConfigProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default Providers
