import { usePrivy } from '@privy-io/react-auth'
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { PropsWithChildren, useCallback, useEffect, useRef } from 'react'
import { type WagmiProviderProps } from 'wagmi'

// Store recovery times per smart wallet address
const walletRecoveryRecordsAtom = atomWithStorage<Record<string, number>>('pcs:socialLogin:walletRecoveryRecords', {})

export function WagmiWithPrivyProvider({ children, ...props }: PropsWithChildren<WagmiProviderProps>) {
  const { authenticated, ready, user, createWallet, setWalletRecovery, logout: privyLogout, login } = usePrivy()
  const [recoveryRecords, setRecoveryRecords] = useAtom(walletRecoveryRecordsAtom)
  const attemptedWalletCreation = useRef(false)

  const handleWalletRecovery = useCallback(() => {
    const smartWalletAddress = user?.smartWallet?.address
    const lastRecoveryForThisWallet = smartWalletAddress ? recoveryRecords[smartWalletAddress] || 0 : 0

    if (authenticated && ready && user?.wallet?.recoveryMethod === 'privy' && user?.smartWallet && smartWalletAddress) {
      const now = Date.now()
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      const timeSinceLastRecovery = now - lastRecoveryForThisWallet
      const shouldTriggerRecovery = timeSinceLastRecovery > oneWeek

      if (shouldTriggerRecovery) {
        setWalletRecovery()

        // Update recovery record for this specific wallet address
        setRecoveryRecords((prev) => ({
          ...prev,
          [smartWalletAddress]: now,
        }))
      }
    }
  }, [ready, user, authenticated, recoveryRecords])

  useEffect(() => {
    if (ready && authenticated && user?.wallet?.address && user?.smartWallet?.address) {
      handleWalletRecovery()
    }
  }, [ready, authenticated, user?.wallet])

  useEffect(() => {
    const createWalletWithUserManagedRecovery = async () => {
      if (ready && authenticated && user?.wallet === undefined && attemptedWalletCreation.current === false) {
        attemptedWalletCreation.current = true
        try {
          await createWallet()
        } catch (error) {
          console.error('Failed to create wallet, retriggering auth lifecycle:', error)
          try {
            const keysToRemove = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && key.startsWith('privy:')) {
                // @ts-ignore
                keysToRemove.push(key)
              }
            }
            keysToRemove.forEach((key) => {
              localStorage.removeItem(key)
            })

            const { retriggerFirebaseAuth } = await import('./firebase')
            await retriggerFirebaseAuth()
          } catch (logoutError) {
            console.error('Failed to retrigger auth:', logoutError)
          }
          attemptedWalletCreation.current = false
        }
      }
    }
    createWalletWithUserManagedRecovery()
  }, [ready, user, authenticated, createWallet])

  return <PrivyWagmiProvider {...props}>{children}</PrivyWagmiProvider>
}
