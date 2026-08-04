import { ChainId, Currency, CurrencyAmount, Native, Token, ZERO_ADDRESS } from '@pancakeswap/sdk'
import { useQuery } from '@tanstack/react-query'
import { multicallABI } from 'config/abi/Multicall'
import { FAST_INTERVAL } from 'config/constants'
import { useActiveChainId } from 'hooks/useActiveChainId'
import useAddressBalance from 'hooks/useAddressBalance'
import useNativeCurrency from 'hooks/useNativeCurrency'
import orderBy from 'lodash/orderBy'
import { useEffect, useMemo } from 'react'
import { safeGetAddress } from 'utils'
import { getMulticallAddress } from 'utils/addressHelpers'
import { publicClient } from 'utils/viem'
import { Address, erc20Abi, getAddress, isAddress } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { useCurrentBlock } from 'state/block/hooks'
import { useMultipleContractSingleDataWagmi } from '../multicall/hooks'

/**
 * Returns a map of the given addresses to their eventually consistent BNB balances.
 */
export function useNativeBalances(account?: Address, chainId?: ChainId): CurrencyAmount<Native> {
  const native = useNativeCurrency(chainId)
  const latestBlockNumber = useCurrentBlock(native?.chainId)

  const { data: results, refetch } = useBalance({
    address: account,
    chainId: native?.chainId,
    query: {
      enabled: Boolean(account && native?.chainId),
    },
  })

  useEffect(() => {
    if (account && native?.chainId) {
      refetch({ cancelRefetch: false })
    }
  }, [latestBlockNumber, account, native?.chainId, refetch])

  return useMemo(() => CurrencyAmount.fromRawAmount(native, results?.value ?? BigInt(0)), [results, native])
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useTokenBalancesWithLoadingIndicator(
  address?: string,
  tokens?: (Token | undefined)[],
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address || '')) ?? [],
    [tokens],
  )

  const addresses = useMemo(() => validatedTokens.map((token) => token.wrapped.address), [validatedTokens])
  const chainIds = useMemo(() => validatedTokens.map((token) => token.chainId), [validatedTokens])
  const args = useMemo(() => [address as Address] as const, [address])

  const { data: balances, isLoading } = useMultipleContractSingleDataWagmi({
    abi: erc20Abi,
    addresses,
    chainId: chainIds,
    functionName: 'balanceOf',
    args,
    options: {
      enabled: Boolean(address && addresses.length > 0),
      watch: true,
      refetchInterval: FAST_INTERVAL,
    },
  })

  const aggregatedBalances = useMemo(
    () =>
      address && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
            const value = balances?.[i]?.result as bigint | undefined
            const amount = typeof value !== 'undefined' ? BigInt(value.toString()) : undefined
            if (typeof amount !== 'undefined') {
              memo[`${token.chainId}-${token.address}`] = CurrencyAmount.fromRawAmount(token, amount)
            }
            return memo
          }, {})
        : {},
    [address, validatedTokens, balances],
  )

  return useMemo(() => [aggregatedBalances, isLoading], [aggregatedBalances, isLoading])
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): CurrencyAmount<Token> | undefined {
  const [tokenBalances] = useTokenBalancesWithLoadingIndicator(
    account,
    useMemo(() => [token], [token]),
  )
  if (!token) return undefined
  return tokenBalances[`${token.chainId}-${token.address}`]
}

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined | null)[],
): (CurrencyAmount<Currency> | undefined)[] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => Boolean(currency?.isToken)) ?? [],
    [currencies],
  )

  const [tokenBalances] = useTokenBalancesWithLoadingIndicator(account, tokens)

  const containsNative: Currency | null = useMemo(
    () => currencies?.find((currency) => currency?.isNative) ?? null,
    [currencies],
  )
  const uncheckedAddresses = useMemo(
    () => (containsNative ? (account as Address) : undefined),
    [containsNative, account],
  )
  const nativeBalance = useNativeBalances(uncheckedAddresses, containsNative?.chainId)

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) return undefined
        if (currency?.isToken) return tokenBalances[`${currency.chainId}-${currency.address}`]
        if (currency?.isNative) return nativeBalance
        return undefined
      }) ?? [],
    [account, currencies, nativeBalance, tokenBalances],
  )
}

export function useCurrencyBalance(account?: string, currency?: Currency | null): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalances(
    account,
    useMemo(() => [currency], [currency]),
  )[0]
}

// get all token balances for the current account by using api
export function useAllTokenBalances(selectedChainId?: number): {
  balances: { [tokenAddress: string]: CurrencyAmount<Token> | undefined }
  isLoading: boolean
} {
  const { address: account } = useAccount()

  // Fetch balances using the hook we created
  const { balances: apiBalances, isLoading: isLoadingBalance } = useAddressBalance(account, {
    includeSpam: false,
    onlyWithPrice: false,
    filterByChainId: selectedChainId,
  })

  return useMemo(() => {
    /// [tokenAddress: string]: CurrencyAmount<Token> | undefined
    const balances = apiBalances.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>(
      (acc, balance) => {
        const [chainId, tokenAddress] = balance.id.split('-')

        const checksummedTokenAddress = safeGetAddress(tokenAddress)

        // Ignore native token because this hook is designed for tokens only, not native one
        if (!checksummedTokenAddress || checksummedTokenAddress === ZERO_ADDRESS) {
          return acc
        }
        // eslint-disable-next-line no-param-reassign
        acc[checksummedTokenAddress] = CurrencyAmount.fromRawAmount(
          new Token(
            Number(chainId),
            checksummedTokenAddress,
            balance.token.decimals,
            balance.token.symbol,
            balance.token.name,
          ),
          balance.value,
        )

        return acc
      },
      {} as { [tokenAddress: string]: CurrencyAmount<Token> | undefined },
    )

    return {
      balances,
      isLoading: isLoadingBalance,
    }
  }, [apiBalances, isLoadingBalance, selectedChainId])
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 * Accepts a chainId to allow for fetching balances on a chain that is not the current chain.
 */
export function useTokenBalancesWithChain(
  address?: string,
  tokens?: (Token | undefined)[],
  chainId?: number,
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address || '')) ?? [],
    [tokens],
  )

  const validatedTokenAddresses = useMemo(() => validatedTokens.map((vt) => vt.address), [validatedTokens])

  const { data: balances, isLoading } = useQuery({
    queryKey: ['balances', address, chainId, validatedTokenAddresses],
    queryFn: () =>
      publicClient({ chainId }).multicall({
        contracts: validatedTokenAddresses.map((tokenAddress) => ({
          abi: erc20Abi,
          address: tokenAddress,
          functionName: 'balanceOf',
          args: [address],
        })),
      }),
    enabled: Boolean(address && validatedTokenAddresses.length > 0),
    retryDelay: 1000,
    retry(failureCount, error) {
      console.error('useTokenBalancesWithChain failed', { error })
      if (failureCount > 3) return false
      return true
    },
  })

  return [
    useMemo(
      () =>
        address && validatedTokens.length > 0
          ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
              const value = balances?.[i]?.result
              const amount = typeof value !== 'undefined' ? BigInt(value.toString()) : undefined
              if (typeof amount !== 'undefined') {
                memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
              }
              return memo
            }, {})
          : {},
      [address, validatedTokens, balances],
    ),
    isLoading,
  ]
}

export function useNativeBalancesWithChain(
  uncheckedAddresses?: (string | undefined)[],
  chainId?: number,
): {
  [address: string]: CurrencyAmount<Native> | undefined
} {
  const native = useNativeCurrency(chainId)

  const addresses: Address[] = useMemo(
    () =>
      uncheckedAddresses
        ? orderBy(uncheckedAddresses.map(safeGetAddress).filter((a): a is Address => a !== undefined))
        : [],
    [uncheckedAddresses],
  )

  const { data: results } = useQuery({
    queryKey: ['ethBalances', addresses, chainId],
    queryFn: () =>
      publicClient({ chainId }).multicall({
        contracts: addresses.map((address) => ({
          abi: multicallABI,
          address: getMulticallAddress(native.chainId),
          functionName: 'getEthBalance',
          args: [address],
        })),
      }),
    enabled: Boolean(addresses.length > 0),
  })

  return useMemo(
    () =>
      addresses.reduce<{ [address: string]: CurrencyAmount<Native> | undefined }>((memo, address, i) => {
        const value = results?.[i]?.result
        if (typeof value !== 'undefined') memo[address] = CurrencyAmount.fromRawAmount(native, BigInt(value.toString()))
        return memo
      }, {}),
    [addresses, results, native],
  )
}

export function useCurrencyBalancesWithChain(
  account?: string,
  currencies?: (Currency | undefined | null)[],
  overrideChainId?: number,
): (CurrencyAmount<Currency> | undefined)[] {
  const { chainId: activeChainId } = useActiveChainId()
  const chainId = overrideChainId || activeChainId

  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => Boolean(currency?.isToken)) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...(currencies ?? [])],
  )

  const tokenBalances = useTokenBalancesWithChain(account, tokens, chainId)
  const containsNative: boolean = useMemo(
    () => currencies?.some((currency) => currency?.isNative) ?? false,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...(currencies ?? [])],
  )
  const uncheckedAddresses = useMemo(() => (containsNative ? [account] : []), [containsNative, account])
  const nativeBalance = useNativeBalancesWithChain(uncheckedAddresses, chainId)

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) return undefined
        if (currency?.isToken) return tokenBalances[0][currency.address]
        if (currency?.isNative) return nativeBalance[account] || nativeBalance[getAddress(account)]
        return undefined
      }) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, ...(currencies ?? []), nativeBalance, tokenBalances],
  )
}

export function useCurrencyBalanceWithChain(
  account?: string,
  currency?: Currency | null,
  chainId?: number,
): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalancesWithChain(
    account,
    useMemo(() => [currency], [currency]),
    chainId,
  )[0]
}
