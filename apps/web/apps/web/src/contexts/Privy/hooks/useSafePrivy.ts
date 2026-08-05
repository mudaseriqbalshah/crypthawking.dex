import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'

import { privyEnabled } from '../enabled'

/**
 * Safe wrappers around the Privy React hooks.
 *
 * The upstream hooks throw when they are called outside of a `PrivyProvider`, and the
 * provider itself throws once it fails to resolve its app config. When social login is
 * disabled (see ../enabled) the provider is not mounted at all, so these wrappers return
 * inert values instead of calling into Privy.
 *
 * `privyEnabled` is inlined at build time, so the branch is constant for the lifetime of
 * a bundle and the rules-of-hooks invariant (same hooks, same order, every render) holds.
 */

type PrivyInterface = ReturnType<typeof usePrivy>
type WalletsInterface = ReturnType<typeof useWallets>
type SmartWalletsInterface = ReturnType<typeof useSmartWallets>

const noop = () => undefined
const noopAsync = async () => undefined

const INERT_PRIVY = {
  ready: false,
  authenticated: false,
  user: null,
  login: noop,
  logout: noopAsync,
  createWallet: noopAsync,
  setWalletRecovery: noopAsync,
  enrollInMfa: noopAsync,
  connectWallet: noop,
  linkWallet: noop,
  exportWallet: noopAsync,
  getAccessToken: noopAsync,
} as unknown as PrivyInterface

const INERT_WALLETS = {
  ready: false,
  wallets: [],
} as unknown as WalletsInterface

const INERT_SMART_WALLETS = {
  client: undefined,
  getClientForChain: noopAsync,
} as unknown as SmartWalletsInterface

export function useSafePrivy(): PrivyInterface {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return privyEnabled ? usePrivy() : INERT_PRIVY
}

export function useSafeWallets(): WalletsInterface {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return privyEnabled ? useWallets() : INERT_WALLETS
}

export function useSafeSmartWallets(): SmartWalletsInterface {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return privyEnabled ? useSmartWallets() : INERT_SMART_WALLETS
}
