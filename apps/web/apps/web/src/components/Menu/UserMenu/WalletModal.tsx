import { useTranslation } from '@pancakeswap/localization'
import {
  ButtonMenu,
  ButtonMenuItem,
  CloseIcon,
  Heading,
  IconButton,
  ModalBody,
  ModalTitle,
  ModalWrapper,
  ModalHeader as UIKitModalHeader,
} from '@pancakeswap/uikit'
import { useCallback } from 'react'
import { styled } from 'styled-components'
import { parseEther } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { useMenuTab, WalletView } from './providers/MenuTabProvider'
import WalletInfo from './WalletInfo'
import WalletTransactions from './WalletTransactions'
import WalletWrongNetwork from './WalletWrongNetwork'

export const LOW_NATIVE_BALANCE = parseEther('0.002', 'wei')

const ModalHeader = styled(UIKitModalHeader)`
  background: ${({ theme }) => theme.colors.gradientBubblegum};
`

const Tabs = styled.div`
  background-color: ${({ theme }) => theme.colors.dropdown};
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  padding: 16px 24px;
`

interface TabsComponentProps {
  view: WalletView
  handleClick: (newIndex: number) => void
  style?: React.CSSProperties
}

export const TabsComponent: React.FC<React.PropsWithChildren<TabsComponentProps>> = ({ view, handleClick, style }) => {
  const { t } = useTranslation()

  return (
    <Tabs style={style}>
      <ButtonMenu scale="sm" variant="subtle" onItemClick={handleClick} activeIndex={view} fullWidth>
        <ButtonMenuItem>{t('Wallet')}</ButtonMenuItem>
        <ButtonMenuItem>{t('Transactions')}</ButtonMenuItem>
        <ButtonMenuItem>{t('Gifts')}</ButtonMenuItem>
      </ButtonMenu>
    </Tabs>
  )
}

const WalletModal: React.FC<React.PropsWithChildren<{ onDismiss?: () => void; initialView?: WalletView }>> = ({
  onDismiss,
}) => {
  const { view, setView } = useMenuTab()
  const { t } = useTranslation()
  const { address: account } = useAccount()
  const { data, isFetched } = useBalance({ address: account })
  const hasLowNativeBalance = Boolean(isFetched && data && data.value <= LOW_NATIVE_BALANCE)

  const handleClick = useCallback((newIndex: number) => {
    setView(newIndex)
  }, [])

  return (
    <ModalWrapper minWidth="360px">
      <ModalHeader>
        <ModalTitle>
          <Heading>{t('Your Wallet')}</Heading>
        </ModalTitle>
        <IconButton variant="text" onClick={onDismiss}>
          <CloseIcon width="24px" color="text" />
        </IconButton>
      </ModalHeader>
      {view !== WalletView.WRONG_NETWORK && <TabsComponent view={view} handleClick={handleClick} />}
      <ModalBody p="24px" width="100%">
        {view === WalletView.WALLET_INFO && (
          <WalletInfo hasLowNativeBalance={hasLowNativeBalance} switchView={handleClick} onDismiss={onDismiss} />
        )}
        {view === WalletView.TRANSACTIONS && !!onDismiss && <WalletTransactions onDismiss={onDismiss} />}
        {view === WalletView.WRONG_NETWORK && !!onDismiss && <WalletWrongNetwork onDismiss={onDismiss} />}
      </ModalBody>
    </ModalWrapper>
  )
}

export default WalletModal
