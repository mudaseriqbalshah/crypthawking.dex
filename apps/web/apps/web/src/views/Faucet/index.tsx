import { ChainId } from '@pancakeswap/chains'
import { baseSepoliaTokens } from '@pancakeswap/tokens'
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CopyButton,
  Flex,
  Grid,
  Heading,
  Input,
  LinkExternal,
  Text,
  useToast,
} from '@pancakeswap/uikit'
import { ToastDescriptionWithTx } from 'components/Toast'
import useAccountActiveChain from 'hooks/useAccountActiveChain'
import useCatchTxError from 'hooks/useCatchTxError'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { styled } from 'styled-components'
import { erc20Abi, formatUnits, parseEther } from 'viem'
import { watchAsset } from 'viem/actions'
import { useAccount, useBalance, useReadContract, useReadContracts, useWalletClient, useWriteContract } from 'wagmi'
import { FAUCET_ADDRESS, faucetAbi, weth9DepositAbi } from './abi'

const WETH9_ADDRESS = '0x4200000000000000000000000000000000000006' as const

// Registry — verified deployed addresses only (packages/deployments/base-sepolia.json)
const REGISTRY: { label: string; address: `0x${string}` }[] = [
  { label: 'Faucet', address: FAUCET_ADDRESS },
  { label: 'WETH9', address: WETH9_ADDRESS },
  { label: 'HAWK', address: baseSepoliaTokens.hawk.address as `0x${string}` },
  { label: 'tUSDC', address: baseSepoliaTokens.usdc.address as `0x${string}` },
  { label: 'tUSDT', address: baseSepoliaTokens.usdt.address as `0x${string}` },
  { label: 'tDAI', address: baseSepoliaTokens.dai.address as `0x${string}` },
  { label: 'tWBTC', address: baseSepoliaTokens.wbtc.address as `0x${string}` },
]

const EXPLORER_BASE = 'https://sepolia.basescan.org/address/'

const tokensByAddress = Object.fromEntries(
  Object.values(baseSepoliaTokens)
    .filter((t: any) => t?.address)
    .map((t: any) => [t.address.toLowerCase(), t]),
)

const StyledGrid = styled(Grid)`
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
  ${({ theme }) => theme.mediaQueries.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  ${({ theme }) => theme.mediaQueries.lg} {
    grid-template-columns: repeat(3, 1fr);
  }
`

const AddressRow = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`

const formatCountdown = (seconds: number) => {
  if (seconds <= 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const DRIP_MODE_TRANSFER = 1

const DripCard: React.FC<{
  token: any
  amount: bigint
  mode: number
  account?: `0x${string}`
}> = ({ token, amount, mode, account }) => {
  const { data: walletClient } = useWalletClient()

  const { data: balance } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    chainId: ChainId.BASE_SEPOLIA,
    query: { enabled: Boolean(account && token?.address) },
  })

  const handleAddToWallet = useCallback(async () => {
    if (!walletClient || !token?.address) return
    try {
      await watchAsset(walletClient, {
        type: 'ERC20',
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
        },
      })
    } catch (error) {
      console.error('watchAsset error', error)
    }
  }, [walletClient, token])

  if (!token) return null

  return (
    <Card>
      <CardHeader>
        <Heading scale="md">{token.symbol}</Heading>
        <Text fontSize="12px" color="textSubtle">
          {token.name}
        </Text>
      </CardHeader>
      <CardBody>
        <Text bold fontSize="20px">
          {Number(formatUnits(amount, token.decimals)).toLocaleString()} {token.symbol}
        </Text>
        <Text fontSize="12px" color="textSubtle" mt="4px">
          per claim
        </Text>
        {account && (
          <Text fontSize="12px" color="textSubtle" mt="8px">
            Your balance: {balance !== undefined ? Number(formatUnits(balance as bigint, token.decimals)).toLocaleString() : '-'}{' '}
            {token.symbol}
          </Text>
        )}
        {mode === DRIP_MODE_TRANSFER && (
          <Text fontSize="11px" color="textSubtle" mt="8px">
            Sent from faucet balance — may be skipped if the faucet is empty.
          </Text>
        )}
        <Button
          mt="12px"
          scale="sm"
          variant="secondary"
          width="100%"
          disabled={!walletClient}
          onClick={handleAddToWallet}
        >
          Add to wallet
        </Button>
      </CardBody>
    </Card>
  )
}

const WethCard: React.FC<{ account?: `0x${string}` }> = ({ account }) => {
  const [amount, setAmount] = useState('0.01')
  const { toastError } = useToast()
  const { fetchWithCatchTxError, loading } = useCatchTxError()
  const { writeContractAsync } = useWriteContract()

  const { data: ethBalance } = useBalance({
    address: account,
    chainId: ChainId.BASE_SEPOLIA,
    query: { enabled: Boolean(account) },
  })
  const { data: wethBalance, refetch: refetchWeth } = useReadContract({
    address: WETH9_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    chainId: ChainId.BASE_SEPOLIA,
    query: { enabled: Boolean(account) },
  })

  const handleWrap = useCallback(async () => {
    let value: bigint
    try {
      value = parseEther(amount || '0')
    } catch (error) {
      toastError('Invalid amount')
      return
    }
    if (value <= 0n) {
      toastError('Enter an amount greater than 0')
      return
    }
    const receipt = await fetchWithCatchTxError(() =>
      writeContractAsync({
        abi: weth9DepositAbi,
        address: WETH9_ADDRESS,
        functionName: 'deposit',
        value,
      }),
    )
    if (receipt?.status) {
      refetchWeth()
    }
  }, [amount, fetchWithCatchTxError, writeContractAsync, toastError, refetchWeth])

  return (
    <Card>
      <CardHeader>
        <Heading scale="md">WETH</Heading>
        <Text fontSize="12px" color="textSubtle">
          Wrapped Ether — wrap test ETH for use across the DEX
        </Text>
      </CardHeader>
      <CardBody>
        <Text fontSize="12px" color="textSubtle">
          ETH balance: {ethBalance ? Number(formatUnits(ethBalance.value, 18)).toFixed(4) : '-'}
        </Text>
        <Text fontSize="12px" color="textSubtle" mb="8px">
          WETH balance: {wethBalance !== undefined ? Number(formatUnits(wethBalance as bigint, 18)).toFixed(4) : '-'}
        </Text>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.currentTarget.value)}
          placeholder="0.01"
          inputMode="decimal"
        />
        <Button mt="12px" width="100%" disabled={!account || loading} onClick={handleWrap}>
          {loading ? 'Wrapping...' : 'Wrap ETH'}
        </Button>
      </CardBody>
    </Card>
  )
}

const Faucet: React.FC = () => {
  const { account } = useAccountActiveChain()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: claimLoading } = useCatchTxError()
  const { writeContractAsync } = useWriteContract()
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: dripCount } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetAbi,
    functionName: 'dripCount',
    chainId: ChainId.BASE_SEPOLIA,
  })

  const { data: cooldown } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetAbi,
    functionName: 'cooldown',
    chainId: ChainId.BASE_SEPOLIA,
  })

  const { data: lastClaim, refetch: refetchLastClaim } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetAbi,
    functionName: 'lastClaim',
    args: account ? [account] : undefined,
    chainId: ChainId.BASE_SEPOLIA,
    query: { enabled: Boolean(account) },
  })

  const dripIndexes = useMemo(() => {
    const count = dripCount ? Number(dripCount) : 0
    return Array.from({ length: count }, (_, i) => i)
  }, [dripCount])

  const { data: dripsData } = useReadContracts({
    contracts: dripIndexes.map((i) => ({
      address: FAUCET_ADDRESS,
      abi: faucetAbi,
      functionName: 'drips',
      args: [BigInt(i)] as const,
      chainId: ChainId.BASE_SEPOLIA,
    })),
    query: { enabled: dripIndexes.length > 0 },
  })

  const drips = useMemo(
    () =>
      (dripsData ?? [])
        .map((d) => d.result as readonly [`0x${string}`, bigint, number] | undefined)
        .filter((d): d is readonly [`0x${string}`, bigint, number] => Boolean(d)),
    [dripsData],
  )

  const secondsRemaining = useMemo(() => {
    if (!lastClaim || !cooldown) return 0
    const readyAt = Number(lastClaim) + Number(cooldown)
    return readyAt - now
  }, [lastClaim, cooldown, now])

  const countdownLabel = formatCountdown(secondsRemaining)
  const canClaim = Boolean(account) && secondsRemaining <= 0

  const handleClaim = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() =>
      writeContractAsync({
        abi: faucetAbi,
        address: FAUCET_ADDRESS,
        functionName: 'claim',
      }),
    )
    if (receipt?.status) {
      toastSuccess('Claimed!', <ToastDescriptionWithTx txHash={receipt.transactionHash} />)
      refetchLastClaim()
    }
  }, [fetchWithCatchTxError, writeContractAsync, toastSuccess, refetchLastClaim])

  return (
    <Box maxWidth="1200px" margin="0 auto" px={['16px', null, '24px']} py="24px">
      <Flex flexDirection="column" mb="24px">
        <Heading as="h1" scale="xl" mb="8px">
          Testnet Faucet
        </Heading>
        <Text color="textSubtle">
          Claim valueless CryptoHawking test tokens on Base Sepolia. One claim() call drips all five tokens below.
          Cooldown: 24 hours.
        </Text>
      </Flex>

      <Flex mb="24px">
        <Button disabled={!canClaim || claimLoading} onClick={handleClaim}>
          {!account
            ? 'Connect wallet'
            : claimLoading
            ? 'Claiming...'
            : canClaim
            ? 'Claim all test tokens'
            : `Next claim in ${countdownLabel}`}
        </Button>
      </Flex>

      <StyledGrid mb="32px">
        {drips.map(([tokenAddress, amount, mode], i) => {
          const token = tokensByAddress[tokenAddress?.toLowerCase()]
          return (
            <DripCard
              // eslint-disable-next-line react/no-array-index-key
              key={`${tokenAddress}-${i}`}
              token={token}
              amount={amount}
              mode={mode}
              account={account}
            />
          )
        })}
        <WethCard account={account} />
      </StyledGrid>

      <Card>
        <CardHeader>
          <Heading scale="md">Contract addresses</Heading>
        </CardHeader>
        <CardBody>
          {REGISTRY.map((entry) => (
            <AddressRow key={entry.address}>
              <Text fontSize="14px">{entry.label}</Text>
              <Flex alignItems="center">
                <LinkExternal href={`${EXPLORER_BASE}${entry.address}`} fontSize="12px" mr="4px">
                  {`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                </LinkExternal>
                <CopyButton text={entry.address} tooltipMessage="Copied" width="14px" />
              </Flex>
            </AddressRow>
          ))}
          <Flex flexDirection="column" mt="16px">
            <Text fontSize="12px" color="textSubtle" mb="4px">
              Need test ETH for gas?
            </Text>
            <LinkExternal href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" fontSize="14px">
              Coinbase Base Sepolia faucet
            </LinkExternal>
            <LinkExternal href="https://www.alchemy.com/faucets/base-sepolia" fontSize="14px">
              Alchemy Base Sepolia faucet
            </LinkExternal>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  )
}

export default Faucet
