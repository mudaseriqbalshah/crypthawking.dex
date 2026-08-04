import { ChainId } from '@pancakeswap/chains'
import memoize from 'lodash/memoize'
import { isAddressEqual } from 'utils'
import { rewardConfig } from './config'
import { RewardProvider } from './types'

// Pure function to check if a farm has rewards
export const checkHasReward = memoize(
  (chainId?: ChainId, poolAddress?: string): boolean => {
    return getRewardProvider(chainId, poolAddress) !== undefined
  },
  (chainId, poolAddress) => `${chainId}#${poolAddress}`,
)

export const getRewardProvider = memoize(
  (chainId?: ChainId, poolAddress?: string): RewardProvider | undefined => {
    if (!chainId || !poolAddress) return undefined
    const chainConfig = rewardConfig[chainId]
    if (!chainConfig) return undefined

    return chainConfig.find((config) => isAddressEqual(config.poolAddress, poolAddress))?.rewardProvider
  },
  (chainId, poolAddress) => `${chainId}#${poolAddress}`,
)
