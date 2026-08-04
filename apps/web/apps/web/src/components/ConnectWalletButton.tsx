import { Button, ButtonProps, FlexGap, WalletFilledV2Icon } from '@pancakeswap/uikit'

import { useCallback, useState } from 'react'
import WalletModalManager from 'components/WalletModalManager'
import { logGTMConnectWalletEvent } from 'utils/customGTMEventTracking'
import { useActiveChainId } from 'hooks/useActiveChainId'
import Trans from './Trans'

interface ConnectWalletButtonProps extends ButtonProps {
  withIcon?: boolean
}

const ConnectWalletButton = ({ children, withIcon, ...props }: ConnectWalletButtonProps) => {
  const [open, setOpen] = useState(false)
  const handleOnDismiss = useCallback(() => setOpen(false), [])
  const { chainId } = useActiveChainId()

  const handleConnectBtnClick = useCallback(() => {
    logGTMConnectWalletEvent(chainId)
    setOpen(true)
  }, [chainId])

  return (
    <>
      <Button onClick={handleConnectBtnClick} {...props}>
        <FlexGap gap="8px" justifyContent="center" alignItems="center">
          {children || <Trans>Connect Wallet</Trans>} {withIcon && <WalletFilledV2Icon color="invertedContrast" />}
        </FlexGap>
      </Button>
      <style jsx global>{`
        w3m-modal {
          position: fixed;
          z-index: 100000000;
        }
      `}</style>
      <WalletModalManager isOpen={open} onDismiss={handleOnDismiss} />
    </>
  )
}

export default ConnectWalletButton
