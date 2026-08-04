import { useTranslation } from '@pancakeswap/localization'
import { WalletConnectorNotFoundError, WalletSwitchChainError } from '@pancakeswap/ui-wallets'
import { usePrivy } from '@privy-io/react-auth'
import { CHAIN_QUERY_NAME } from 'config/chains'
import { ConnectorNames } from 'config/wallet'
import { useAtom } from 'jotai'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { useAppDispatch } from 'state'
import { CONNECTOR_MAP } from 'utils/wagmi'
import { ConnectorNotFoundError, SwitchChainNotSupportedError, useAccount, useConnect, useDisconnect } from 'wagmi'
import { useFirebaseAuth } from '../contexts/Privy/firebase'
import { clearUserStates } from '../utils/clearUserStates'
import { queryChainIdAtom, useActiveChainId } from './useActiveChainId'

const useAuth = () => {
  const dispatch = useAppDispatch()
  const { connectAsync, connectors } = useConnect()
  const { chain } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const { chainId } = useActiveChainId()
  const [, setQueryChainId] = useAtom(queryChainIdAtom)
  const { t } = useTranslation()
  const router = useRouter()
  const { logout: privyLogout, ready, authenticated } = usePrivy()
  const { signOutAndClearUserStates } = useFirebaseAuth()

  const login = useCallback(
    async (connectorID: ConnectorNames) => {
      const findConnector = CONNECTOR_MAP[connectorID] || undefined
      try {
        if (!findConnector) return undefined

        const connected = await connectAsync({ connector: findConnector, chainId })
        if (connected.chainId !== chainId) {
          router.replace(
            {
              pathname: router.pathname,
              query: {
                ...router.query,
                chain: CHAIN_QUERY_NAME[connected.chainId],
              },
            },
            undefined,
            {
              shallow: true,
            },
          )

          setQueryChainId(connected.chainId)
        }
        return connected
      } catch (error) {
        if (error instanceof ConnectorNotFoundError) {
          throw new WalletConnectorNotFoundError()
        }
        if (
          error instanceof SwitchChainNotSupportedError
          // TODO: wagmi
          // || error instanceof SwitchChainError
        ) {
          throw new WalletSwitchChainError(t('Unable to switch network. Please try it on your wallet'))
        }
      }
      return undefined
    },
    [connectors, connectAsync, chainId, setQueryChainId, t, router],
  )

  const logout = useCallback(async () => {
    try {
      if (authenticated && ready) {
        await signOutAndClearUserStates()
        await privyLogout()
      } else await disconnectAsync()
    } catch (error) {
      console.error(error)
    } finally {
      clearUserStates(dispatch, { chainId: chain?.id })
      // Clear wagmi storage to prevent auto-reconnect for wallets like Trust Wallet
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('wagmi.recentConnectorId')
        window.localStorage.removeItem('wagmi.store')
      }
    }
  }, [disconnectAsync, dispatch, chain?.id, authenticated, ready, signOutAndClearUserStates, privyLogout])

  return { login, logout }
}

export default useAuth
