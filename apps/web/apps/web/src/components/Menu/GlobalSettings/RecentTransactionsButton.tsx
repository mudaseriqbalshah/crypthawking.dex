import { ButtonProps, Flex, HistoryIcon, IconButton, ModalV2, useModalV2 } from '@pancakeswap/uikit'

import { SettingsModalV2, SettingsTabIndex } from './SettingsModalV2'
import { SettingsMode } from './types'

interface RecentTransactionsButtonProps extends ButtonProps {
  color?: string
  overrideButton?: (onClick: () => void) => React.ReactNode
}

const RecentTransactionsButton = ({ overrideButton, color, ...props }: RecentTransactionsButtonProps) => {
  const { isOpen, setIsOpen, onDismiss } = useModalV2()

  const openModal = () => setIsOpen(true)

  return (
    <Flex>
      {overrideButton?.(openModal) || (
        <IconButton
          onClick={openModal}
          variant="text"
          scale="sm"
          id="open-settings-dialog-button-recent-transactions"
          {...props}
        >
          <HistoryIcon height={26} width={26} color={color || 'textSubtle'} />
        </IconButton>
      )}

      <ModalV2 isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick>
        <SettingsModalV2
          onDismiss={onDismiss}
          mode={SettingsMode.SWAP_LIQUIDITY}
          defaultTabIndex={SettingsTabIndex.RECENT_TRANSACTIONS}
        />
      </ModalV2>
    </Flex>
  )
}

export default RecentTransactionsButton
