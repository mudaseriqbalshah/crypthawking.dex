import { ChainId } from '@pancakeswap/chains'
import { useTranslation } from '@pancakeswap/localization'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Box,
  Button,
  Flex,
  InfoIcon,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
  ModalV2,
  ModalWrapper,
  Text,
  useMatchBreakpoints,
  UserMenuDivider,
  UserMenuItem,
  useTooltip,
} from '@pancakeswap/uikit'
import { useActiveChainId, useLocalNetworkChain } from 'hooks/useActiveChainId'
import { useHover } from 'hooks/useHover'
import { useSwitchNetwork } from 'hooks/useSwitchNetwork'
import useTheme from 'hooks/useTheme'
import { atom, useAtom } from 'jotai'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'
import { useUserShowTestnet } from 'state/user/hooks/useUserShowTestnet'
import { chainNameConverter } from 'utils/chainNameConverter'
import { chains as evmChains } from 'utils/wagmi'
import { useAccount } from 'wagmi'
import { Chain } from 'wagmi/chains'
import { ChainLogo } from './Logo/ChainLogo'

interface NonEvmChain {
  id: number
  name: string
  link: string
  image: string
}

const NON_EVM_CHAINS: NonEvmChain[] = [
  {
    id: 1,
    name: 'Aptos',
    link: 'https://aptos.pancakeswap.finance/swap',
    image: 'https://aptos.pancakeswap.finance/images/apt.png',
  },
  {
    id: 2,
    name: 'Solana',
    link: process.env.SOLANA_SWAP_PAGE ?? 'https://solana.pancakeswap.finance/swap',
    image: 'https://tokens.pancakeswap.finance/images/symbol/sol.png',
  },
]

export const networkSwitcherModalAtom = atom(false)

interface NetworkSelectProps {
  switchNetwork: (chainId: number) => void
  chainId: number
  isWrongNetwork: boolean
  onDismiss: () => void
}

type Network = (Chain & { isEvm: true }) | (NonEvmChain & { isEvm: false })

function getSortedChains(chainId: ChainId, showTestnet: boolean): Network[] {
  const chainOrder = [
    'BNB Smart Chain', // BSC
    'Ethereum', // ETH
    'Solana', // SOL
    'Base', // Base
    'Arbitrum One', // ARB
    'ZKsync Era', // ZKsync
    'Linea Mainnet', // Linea
    'Aptos', // Aptos
    'opBNB', // Opbnb
    'Polygon zkEVM', // ZKevm
  ] as const

  const chainRnk: Record<string, number> = {}
  chainOrder.forEach((chain, i) => {
    chainRnk[chain] = i
  })

  // 1) filter your EVM list based on the same logic you had...
  const filteredEvm = evmChains.filter((chain) => {
    if (chain.id === chainId) return true
    if ('testnet' in chain && chain.testnet && chain.id !== ChainId.MONAD_TESTNET) {
      return showTestnet
    }
    return true
  })

  // 2) build a single `networks` array
  const networks: Network[] = [
    ...filteredEvm.map((chain) => ({ ...chain, isEvm: true } as Network)), // mark as EVM
    ...NON_EVM_CHAINS.map((chain) => ({ ...chain, isEvm: false } as Network)), // mark as non-EVM
  ].sort((a, b) => {
    const rnkA = chainRnk[a.name] ?? 1000
    const rnkB = chainRnk[b.name] ?? 1000
    return rnkA - rnkB
  })
  return networks
}

const NetworkSelect = ({ switchNetwork, chainId, isWrongNetwork, onDismiss }: NetworkSelectProps) => {
  const { t } = useTranslation()
  const [showTestnet] = useUserShowTestnet()
  const { theme } = useTheme()
  const { isMobile } = useMatchBreakpoints()
  const networks = useMemo(() => getSortedChains(chainId, showTestnet), [chainId, showTestnet])

  return (
    <Box borderRadius={isMobile ? '32px' : '32px 32px 0 0'} overflow="hidden">
      <ModalHeader background={theme.colors.gradientCardHeader}>
        <ModalTitle>
          <Text bold fontSize="20px">
            {t('Select a Network')}
          </Text>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>

      <Box maxHeight="70vh" overflow="auto" padding="16px 0">
        {networks.map((net) =>
          net.isEvm ? (
            // EVM item: switch in-wallet
            <UserMenuItem
              key={net.id}
              style={{ justifyContent: 'flex-start', cursor: 'pointer', padding: '0px 24px' }}
              onClick={() => {
                if (net.id !== chainId || isWrongNetwork) {
                  switchNetwork(net.id)
                }
                onDismiss()
              }}
            >
              <ChainLogo chainId={net.id} />
              <Text
                color={net.id === chainId && !isWrongNetwork ? 'secondary' : 'text'}
                bold={net.id === chainId && !isWrongNetwork}
                pl="12px"
              >
                {chainNameConverter(net.name)}
              </Text>
            </UserMenuItem>
          ) : (
            // non-EVM item: external link
            <UserMenuItem
              key={`non-evm-${net.id}`}
              as="a"
              href={net.link}
              target="_blank"
              style={{ justifyContent: 'flex-start', cursor: 'pointer', padding: '0px 24px' }}
            >
              <Image src={net.image} width={24} height={24} unoptimized alt={net.name} />
              <Text color="text" pl="12px">
                {net.name}
              </Text>
            </UserMenuItem>
          ),
        )}
      </Box>
    </Box>
  )
}

interface WrongNetworkSelectProps {
  switchNetwork: (chainId: number) => void
  chainId: number
  onDismiss: () => void
}

const WrongNetworkSelect = ({ switchNetwork, chainId, onDismiss }: WrongNetworkSelectProps) => {
  const { t } = useTranslation()
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    t(
      'The URL you are accessing (Chain id: %chainId%) belongs to %network%; mismatching your wallet’s network. Please switch the network to continue.',
      {
        chainId,
        network: evmChains.find((c) => c.id === chainId)?.name ?? 'Unknown network',
      },
    ),
    {
      placement: 'auto-start',
      hideTimeout: 0,
    },
  )
  const { chain } = useAccount()
  const localChainId = useLocalNetworkChain() || ChainId.BSC

  const localChainName = evmChains.find((c) => c.id === localChainId)?.name ?? 'BSC'

  const [ref1, isHover] = useHover<HTMLButtonElement>()

  return (
    <>
      <Flex ref={targetRef} alignItems="center" px="16px" py="8px">
        <InfoIcon color="textSubtle" />
        <Text color="textSubtle" pl="6px">
          {t('Please switch network')}
        </Text>
      </Flex>
      {tooltipVisible && tooltip}
      <UserMenuDivider />
      {chain && (
        <UserMenuItem ref={ref1} style={{ justifyContent: 'flex-start' }}>
          <ChainLogo chainId={chain.id} />
          <Text color="secondary" bold pl="12px">
            {chainNameConverter(chain.name)}
          </Text>
        </UserMenuItem>
      )}
      <Box px="16px" pt="8px">
        {isHover ? <ArrowUpIcon color="text" /> : <ArrowDownIcon color="text" />}
      </Box>
      <UserMenuItem
        onClick={() => {
          switchNetwork(localChainId)
          onDismiss()
        }}
        style={{ justifyContent: 'flex-start' }}
      >
        <ChainLogo chainId={localChainId} />
        <Text pl="12px">{chainNameConverter(localChainName)}</Text>
      </UserMenuItem>
      <Button
        mx="16px"
        my="8px"
        scale="sm"
        onClick={() => {
          switchNetwork(localChainId)
          onDismiss()
        }}
      >
        {t('Switch network in wallet')}
      </Button>
    </>
  )
}

export const NetworkSwitcherModal = () => {
  const { chainId, isWrongNetwork, isNotMatched } = useActiveChainId()
  const { switchNetworkAsync } = useSwitchNetwork()
  const router = useRouter()
  const [isOpen, setIsOpen] = useAtom(networkSwitcherModalAtom)

  const handleDismiss = useCallback(() => {
    setIsOpen(false)
  }, [])

  if (!chainId || router.pathname.includes('/info')) {
    return null
  }

  return (
    <ModalV2 isOpen={isOpen} onDismiss={handleDismiss} closeOnOverlayClick>
      <ModalWrapper minWidth="360px" maxHeight="90vh" style={{ overflowY: 'auto' }}>
        {isNotMatched ? (
          <WrongNetworkSelect switchNetwork={switchNetworkAsync} chainId={chainId} onDismiss={handleDismiss} />
        ) : (
          <NetworkSelect
            switchNetwork={switchNetworkAsync}
            chainId={chainId}
            isWrongNetwork={isWrongNetwork}
            onDismiss={handleDismiss}
          />
        )}
      </ModalWrapper>
    </ModalV2>
  )
}
