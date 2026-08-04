import { ChainId } from '@pancakeswap/chains'
import { Flex, useMatchBreakpoints } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { PUBLIC_NODES } from 'config/nodes'
import { lazy, Suspense, useEffect } from 'react'
import { CHAIN_IDS } from 'utils/wagmi'
import Page from 'views/Page'

const CanonicalBridge = lazy(() =>
  import('@pancakeswap/canonical-bridge').then((module) => ({ default: module.CanonicalBridge })),
)

// Fix portal conflicts between Privy and Chakra portals
function usePortalConflictFix() {
  useEffect(() => {
    const handlePortalConflict = () => {
      // Check for both portals existing
      const headlessuiPortals = document.querySelectorAll('[id*="headlessui-portal-root"]')
      const chakraPortals = document.querySelectorAll('[class*="chakra-portal"]')

      if (headlessuiPortals.length > 0 && chakraPortals.length > 0) {
        // Temporarily hide chakra portals when headlessui modal is active
        chakraPortals.forEach((portal) => {
          const portalElement = portal as HTMLElement
          portalElement.style.visibility = 'hidden'
        })

        // Restore visibility when headlessui portal is removed
        const observer = new MutationObserver(() => {
          const remainingHeadlessuiPortals = document.querySelectorAll('[id*="headlessui-portal-root"]')
          if (remainingHeadlessuiPortals.length === 0) {
            chakraPortals.forEach((portal) => {
              const portalElement = portal as HTMLElement
              portalElement.style.visibility = 'visible'
            })
          }
        })

        observer.observe(document.body, { childList: true, subtree: true })

        return () => observer.disconnect()
      }

      return undefined
    }

    // Monitor for portal creation
    const portalObserver = new MutationObserver(handlePortalConflict)
    portalObserver.observe(document.body, { childList: true, subtree: true })

    // Also check immediately
    handlePortalConflict()

    return () => {
      portalObserver.disconnect()
    }
  }, [])
}

const DISABLED_TO_CHAINS = [ChainId.POLYGON_ZKEVM]

const BridgePage = () => {
  const { isMobile } = useMatchBreakpoints()

  // Fix portal conflicts on this page
  usePortalConflictFix()

  return (
    <Page removePadding hideFooterOnDesktop={false} showExternalLink={false} showHelpLink={false} noMinHeight>
      <Flex
        width="100%"
        height="100%"
        justifyContent="center"
        position="relative"
        px={isMobile ? '16px' : '24px'}
        pb={isMobile ? '14px' : '48px'}
        pt={isMobile ? '24px' : '64px'}
        alignItems="flex-start"
        max-width="unset"
      >
        <Suspense>
          <CanonicalBridge
            connectWalletButton={<ConnectWalletButton width="100%" />}
            supportedChainIds={CHAIN_IDS}
            // @ts-ignore
            rpcConfig={PUBLIC_NODES}
            disabledToChains={DISABLED_TO_CHAINS}
          />
        </Suspense>
      </Flex>
    </Page>
  )
}

BridgePage.chains = CHAIN_IDS
BridgePage.screen = true

export default BridgePage
