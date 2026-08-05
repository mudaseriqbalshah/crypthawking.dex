import { useSafePrivy } from '../contexts/Privy/hooks/useSafePrivy'
import { useEffect, useState } from 'react'

function useConnectedViaEmbeddedWallet() {
  const { authenticated } = useSafePrivy()
  return authenticated
}

export function useSecurityBlocking() {
  const [blocking, setBlocking] = useState(false)
  const isConnectedViaEmbeddedWallet = useConnectedViaEmbeddedWallet()

  useEffect(() => {
    if (isConnectedViaEmbeddedWallet && typeof window !== 'undefined' && window.self !== window.top) {
      setBlocking(true)
    }
  }, [isConnectedViaEmbeddedWallet])

  return blocking
}
