import { useTranslation } from '@pancakeswap/localization'
import { Box, Flex, LogoIcon, Modal, ModalV2 } from '@pancakeswap/uikit'

import { QRCodeSVG } from 'qrcode.react'
import { styled } from 'styled-components'
import { CopyAddress } from './WalletCopyButton'

interface ReceiveModalProps {
  account: string
  onDismiss: () => void
  isOpen: boolean
}

const QRCodeWrapper = styled(Box)`
  background-color: ${({ theme }) => theme.colors.tertiary};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`

const QRCode = styled(Box)`
  width: 262px;
  height: 262px;
  background-color: white;
  border-radius: 16px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
`

const ReceiveModal: React.FC<React.PropsWithChildren<ReceiveModalProps>> = ({ account, onDismiss, isOpen }) => {
  const { t } = useTranslation()

  return (
    <ModalV2 isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick>
      <Modal title={t('Receive crypto')}>
        <Flex flexDirection="column" alignItems="center" justifyContent="center" maxWidth="450px">
          <QRCodeWrapper>
            <QRCode>
              <Box position="relative">
                <QRCodeSVG
                  value={account}
                  size={246}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '/images/tokens/pancakeswap-token.png',
                    x: undefined,
                    y: undefined,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  style={{ transform: 'translate(-50%, -50%)' }}
                  background="white"
                >
                  <LogoIcon width="40px" />
                </Box>
              </Box>
            </QRCode>
          </QRCodeWrapper>

          <Box width="100%" mt="24px">
            <CopyAddress account={account} tooltipMessage={t('Copied')} />
          </Box>
        </Flex>
      </Modal>
    </ModalV2>
  )
}

export default ReceiveModal
