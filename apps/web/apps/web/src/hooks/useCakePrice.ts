import { ChainId } from '@pancakeswap/chains'
import { fetchBaseSepoliaHawkUsdPrice } from '@pancakeswap/farms'
import { chainlinkOracleCAKE } from '@pancakeswap/prediction'
import { BIG_ZERO } from '@pancakeswap/utils/bigNumber'
import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { chainlinkOracleABI } from 'config/abi/chainlinkOracle'
import { FAST_INTERVAL } from 'config/constants'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { publicClient } from 'utils/wagmi'
import { formatUnits } from 'viem'

// for migration to bignumber.js to avoid breaking changes
export const useCakePrice = ({ enabled = true } = {}) => {
  const { chainId } = useActiveChainId()
  const { data } = useQuery<BigNumber, Error>({
    queryKey: ['cakePrice', chainId],
    queryFn: async () => new BigNumber(await getCakePriceFromOracle(chainId)),
    staleTime: FAST_INTERVAL * 6,
    refetchInterval: FAST_INTERVAL * 6,
    enabled,
  })
  return data ?? BIG_ZERO
}

/**
 * Governance-token USD price used across farm/pool APR math.
 *
 * On chain 84532 the reward token is HAWK, which has no Chainlink feed and no external
 * price API entry, and this fork must not read BSC mainnet at all (CLAUDE.md rules 1 & 5).
 * Derive it from our own deployed V2 pairs instead — HAWK/WETH reserves priced through the
 * tUSDC/WETH pair with tUSDC pegged at $1. Callers that pass no chainId (server/edge paths
 * that are inherently BSC-scoped) keep the original Chainlink CAKE/USD behavior unchanged.
 */
export const getCakePriceFromOracle = async (chainId?: number) => {
  if (chainId === ChainId.BASE_SEPOLIA) {
    return fetchBaseSepoliaHawkUsdPrice(publicClient as any)
  }

  const data = await publicClient({ chainId: ChainId.BSC }).readContract({
    abi: chainlinkOracleABI,
    address: chainlinkOracleCAKE[ChainId.BSC],
    functionName: 'latestAnswer',
  })

  return formatUnits(data, 8)
}
