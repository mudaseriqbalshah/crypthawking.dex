import { getMasterChefChainId, isClassicMasterChefV1Chain, isOwnMasterChefChain } from '@pancakeswap/farms'
import BigNumber from 'bignumber.js'
import { masterChefV2ABI } from 'config/abi/masterchefV2'
import { crossFarmingVaultABI } from 'config/abi/crossFarmingVault'
import { v2BCakeWrapperABI } from 'config/abi/v2BCakeWrapper'
import { SerializedFarmConfig, SerializedFarmPublicData } from 'config/constants/types'
import { farmFetcher } from 'state/farms'
import { getMasterChefV2Address, getCrossFarmingVaultAddress } from 'utils/addressHelpers'
import { getCrossFarmingReceiverContract } from 'utils/contractHelpers'
import { publicClient } from 'utils/wagmi'
import { Address, erc20Abi } from 'viem'

/**
 * These reads used to branch on `verifyBscNetwork(chainId)` — "is this BSC or BSC_TESTNET"
 * — which is really a proxy for "does this chain hold its own MasterChef, or are its farms
 * cross-farmed onto BSC". `isOwnMasterChefChain` asks that question directly, and because
 * `masterChefAddresses` contains exactly {BSC, BSC_TESTNET, BASE_SEPOLIA}, it returns the
 * identical answer as `verifyBscNetwork` for every pre-existing chain — the only chain whose
 * behavior changes is our own. Cross-farming chains (ETHEREUM, ARBITRUM_ONE, …) keep the
 * crossFarmingVault + cProxy path untouched.
 */

/**
 * MasterChef v1's `userInfo` mapping returns (amount, rewardDebt); MasterChefV2's returns
 * (amount, rewardDebt, boostMultiplier). Decoding the 2-field return with the 3-field ABI
 * fails, so v1 chains need their own. `pendingCake(uint256,address) -> uint256` is byte
 * identical between v1 and V2 (verified against contracts/farms/contracts/MasterChef.sol),
 * so the earnings read below can keep using `masterChefV2ABI`.
 */
const masterChefV1UserInfoABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const fetchFarmUserAllowances = async (
  account: Address,
  farmsToFetch: SerializedFarmPublicData[],
  chainId: number,
) => {
  const hasOwnChef = isOwnMasterChefChain(chainId)
  const masterChefAddress = hasOwnChef ? getMasterChefV2Address(chainId)! : getCrossFarmingVaultAddress(chainId)

  const lpAllowances = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      const lpContractAddress = farm.lpAddress
      return {
        abi: erc20Abi,
        address: lpContractAddress,
        functionName: 'allowance',
        args: [account, masterChefAddress] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedLpAllowances = lpAllowances.map((lpBalance) => {
    return new BigNumber(lpBalance.toString()).toJSON()
  })

  return parsedLpAllowances
}

export const fetchFarmBCakeWrapperUserAllowances = async (
  account: Address,
  farmsToFetch: SerializedFarmPublicData[],
  chainId: number,
) => {
  const lpAllowances = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      const lpContractAddress = farm.lpAddress
      return {
        abi: erc20Abi,
        address: lpContractAddress,
        functionName: 'allowance',
        args: [account, farm?.bCakeWrapperAddress ?? '0x'] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedLpAllowances = lpAllowances.map((lpBalance) => {
    return new BigNumber(lpBalance.toString()).toJSON()
  })

  return parsedLpAllowances
}

export const fetchFarmUserTokenBalances = async (
  account: string,
  farmsToFetch: SerializedFarmConfig[],
  chainId: number,
) => {
  const rawTokenBalances = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      const lpContractAddress = farm.lpAddress
      return {
        abi: erc20Abi,
        address: lpContractAddress,
        functionName: 'balanceOf',
        args: [account as Address] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedTokenBalances = rawTokenBalances.map((tokenBalance) => {
    return new BigNumber(tokenBalance.toString()).toJSON()
  })
  return parsedTokenBalances
}

export const fetchFarmUserStakedBalances = async (
  account: string,
  farmsToFetch: SerializedFarmConfig[],
  chainId: number,
) => {
  const hasOwnChef = isOwnMasterChefChain(chainId)
  const masterChefAddress = hasOwnChef ? getMasterChefV2Address(chainId)! : getCrossFarmingVaultAddress(chainId)
  // eslint-disable-next-line no-nested-ternary
  const userInfoAbi = hasOwnChef
    ? isClassicMasterChefV1Chain(chainId)
      ? masterChefV1UserInfoABI
      : masterChefV2ABI
    : crossFarmingVaultABI

  const rawStakedBalances = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: userInfoAbi,
        address: masterChefAddress,
        functionName: 'userInfo',
        args: [BigInt(farm.vaultPid ?? farm.pid), account as Address] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedStakedBalances = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance[0].toString()).toJSON()
  })
  return parsedStakedBalances
}

export const fetchFarmUserBCakeWrapperStakedBalances = async (
  account: string,
  farmsToFetch: SerializedFarmPublicData[],
  chainId: number,
) => {
  const boosterPrecision = '1000000000000'
  const rawStakedBalances = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'userInfo',
        args: [account as Address] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedStakedBalances = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance[0].toString()).toJSON()
  })
  const boosterMultiplier = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance[2].toString()).div(boosterPrecision).toNumber()
  })
  const boostedAmounts = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance[3].toString()).toJSON()
  })

  return { parsedStakedBalances, boosterMultiplier, boostedAmounts }
}

export const fetchFarmUserBCakeWrapperConstants = async (farmsToFetch: SerializedFarmPublicData[], chainId: number) => {
  const boosterContractAddress = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'boostContract',
      } as const
    }),
    allowFailure: false,
  })
  const startTimestamp = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'startTimestamp',
      } as const
    }),
    allowFailure: false,
  })
  const endTimestamp = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'endTimestamp',
      } as const
    }),
    allowFailure: false,
  })

  const totalBoostedShare = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'totalBoostedShare',
      } as const
    }),
    allowFailure: false,
  })
  const lpBalanceOf = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: erc20Abi,
        address: farm?.lpAddress ?? '0x',
        functionName: 'balanceOf',
        args: [farm?.bCakeWrapperAddress ?? '0x'],
      } as const
    }),
    allowFailure: false,
  })
  const totalLiquidityX = totalBoostedShare.map((share, index) => {
    if (!share || !lpBalanceOf[index]) return 1
    return new BigNumber(share.toString()).div(lpBalanceOf[index].toString()).toNumber()
  })

  return {
    boosterContractAddress,
    startTimestamp: startTimestamp.map((d) => Number(d)),
    endTimestamp: endTimestamp.map((d) => Number(d)),
    totalLiquidityX,
  }
}

export const fetchFarmUserBCakeWrapperRewardPerSec = async (
  farmsToFetch: SerializedFarmPublicData[],
  chainId: number,
) => {
  const rewardPerSec = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'rewardPerSecond',
      } as const
    }),
    allowFailure: false,
  })

  return { rewardPerSec: rewardPerSec.map((reward) => Number(reward)) }
}

export const fetchFarmUserEarnings = async (
  account: Address,
  farmsToFetch: SerializedFarmConfig[],
  chainId: number,
) => {
  const hasOwnChef = isOwnMasterChefChain(chainId)
  const multiCallChainId = getMasterChefChainId(chainId, farmFetcher.isTestnet(chainId))
  // Self-hosted chef chains stake directly, so rewards accrue to the user's own address.
  // Only cross-farmed chains route through a cProxy on BSC.
  const userAddress = hasOwnChef ? account : await fetchCProxyAddress(account, multiCallChainId)
  const masterChefAddress = getMasterChefV2Address(multiCallChainId)!

  const rawEarnings = await publicClient({ chainId: multiCallChainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: masterChefV2ABI,
        address: masterChefAddress,
        functionName: 'pendingCake',
        args: [BigInt(farm.pid), userAddress as Address] as const,
      } as const
    }),
    allowFailure: false,
  })

  const parsedEarnings = rawEarnings.map((earnings) => {
    return new BigNumber(earnings.toString()).toJSON()
  })
  return parsedEarnings
}

export const fetchFarmUserBCakeWrapperEarnings = async (
  account: Address,
  farmsToFetch: SerializedFarmPublicData[],
  chainId: number,
) => {
  const rawEarnings = await publicClient({ chainId }).multicall({
    contracts: farmsToFetch.map((farm) => {
      return {
        abi: v2BCakeWrapperABI,
        address: farm?.bCakeWrapperAddress ?? '0x',
        functionName: 'pendingReward',
        args: [account] as const,
      } as const
    }),
    allowFailure: false,
  })
  const parsedEarnings = rawEarnings.map((earnings) => {
    return new BigNumber(earnings.toString()).toJSON()
  })
  return parsedEarnings
}

export const fetchCProxyAddress = async (address: Address, chainId: number) => {
  try {
    const crossFarmingAddress = getCrossFarmingReceiverContract(undefined, chainId)
    const cProxyAddress = await crossFarmingAddress.read.cProxy([address])
    return cProxyAddress
  } catch (error) {
    console.error('Failed Fetch CProxy Address', error)
    return address
  }
}
