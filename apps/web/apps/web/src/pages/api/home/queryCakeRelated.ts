import { ChainId } from '@pancakeswap/chains'
import { calcGaugesVotingABI } from '@pancakeswap/gauges'
import { BIG_ZERO } from '@pancakeswap/utils/bigNumber'
import { cacheByLRU } from '@pancakeswap/utils/cacheByLRU'
import BigNumber from 'bignumber.js'
import { revenueSharingPoolProxyABI } from 'config/abi/revenueSharingPoolProxy'
import { veCakeABI } from 'config/abi/veCake'
import { WEEK } from 'config/constants/veCake'
import {
  getCakeVaultAddress,
  getCalcGaugesVotingAddress,
  getRevenueSharingCakePoolAddress,
  getRevenueSharingVeCakeAddress,
  getVeCakeAddress,
} from 'utils/addressHelpers'
import { getViemClients } from 'utils/viem.server'
import { formatEther } from 'viem/utils'
import { BRIBE_APR, fetchCakePoolEmission } from 'views/CakeStaking/hooks/useAPR'
import { PublicClient } from 'viem/_types/clients/createPublicClient'
import { erc20Abi } from 'viem'
import { bscTokens } from '@pancakeswap/tokens'
import { cakeVaultV2ABI } from '@pancakeswap/pools'
import addresses from 'config/constants/contracts'
import { formatBigInt } from '@pancakeswap/utils/formatBalance'
import { CakeRelatedFigures } from './types'
import { getHomeCacheSettings } from './queries/settings'

/**
 * User (Planet Finance) built a contract on top of our original manual CAKE pool,
 * but the contract was written in such a way that when we performed the migration from Masterchef v1 to v2, the tokens were stuck.
 * These stuck tokens are forever gone (see their medium post) and can be considered out of circulation.
 * https://planetfinanceio.medium.com/pancakeswap-works-with-planet-to-help-cake-holders-f0d253b435af
 * https://twitter.com/PancakeSwap/status/1523913527626702849
 * https://bscscan.com/tx/0xd5ffea4d9925d2f79249a4ce05efd4459ed179152ea5072a2df73cd4b9e88ba7
 */
const planetFinanceBurnedTokensWei = 637407922445268000000000n
const cakeVaultAddress = getCakeVaultAddress()

export async function fetchCakeStats(client: PublicClient) {
  const [totalSupply, burned, totalVaultLockedAmount, totalVeLockedAmount] = await client.multicall({
    contracts: [
      { abi: erc20Abi, address: bscTokens.cake.address, functionName: 'totalSupply' },
      {
        abi: erc20Abi,
        address: bscTokens.cake.address,
        functionName: 'balanceOf',
        args: ['0x000000000000000000000000000000000000dEaD'],
      },
      {
        abi: cakeVaultV2ABI,
        address: cakeVaultAddress,
        functionName: 'totalLockedAmount',
      },
      {
        abi: erc20Abi,
        address: bscTokens.cake.address,
        functionName: 'balanceOf',
        args: [addresses.veCake[ChainId.BSC]],
      },
    ],
    allowFailure: false,
  })
  const totalBurned = planetFinanceBurnedTokensWei + burned
  const circulating = totalSupply - (totalBurned + totalVaultLockedAmount + totalVeLockedAmount)

  return {
    cakeSupply: totalSupply && burned ? +formatBigInt(totalSupply - totalBurned) : 0,
    burnedBalance: burned ? +formatBigInt(totalBurned) : 0,
    circulatingSupply: circulating ? +formatBigInt(circulating) : 0,
  }
}

export const queryCakeRelated = cacheByLRU(async () => {
  const veCakeTotalSupply = await getVeCakeTotalSupply()

  const [revShareApr, cakePoolEmission, totalCakeDistributed, cakeStats, gaugeTotalWeight] = await Promise.all([
    getRevShareEmissionApr(veCakeTotalSupply),
    getCakePoolEmission(),
    getCakeDistributed(),
    getCakeStats(),
    queryGaugeTotalVote(),
  ])

  const veCAKEApr = getVeCAKEPoolApr(cakePoolEmission, veCakeTotalSupply)
  const totalApr = revShareApr.plus(veCAKEApr).plus(BRIBE_APR)
  return {
    totalApr: parseFloat(totalApr.toString()),
    totalCakeDistributed: parseFloat(totalCakeDistributed.toString()),
    burned: 16_000_000_000,
    cakeStats,
    gaugeTotalWeight: gaugeTotalWeight.toString(),
    weeklyReward: 401644,
  } as CakeRelatedFigures
}, getHomeCacheSettings('cake-related'))

export const queryGaugeTotalVote = cacheByLRU(async () => {
  const client = getViemClients({ chainId: ChainId.BSC })
  const totalWeight = await client.readContract({
    abi: calcGaugesVotingABI,
    address: getCalcGaugesVotingAddress(ChainId.BSC),
    functionName: 'getTotalWeight',
    args: [true],
  })
  return formatEther(totalWeight)
}, getHomeCacheSettings('gauge-total-vote'))

async function getCakeStats() {
  const client = getViemClients({ chainId: ChainId.BSC })
  return fetchCakeStats(client)
}

async function getCakeDistributed() {
  const client = getViemClients({ chainId: ChainId.BSC })

  const cakePoolDistributed = await client.readContract({
    abi: revenueSharingPoolProxyABI,
    address: getRevenueSharingCakePoolAddress(ChainId.BSC),
    functionName: 'totalDistributed',
  })

  const veCakeDistributed = await client.readContract({
    abi: revenueSharingPoolProxyABI,
    address: getRevenueSharingVeCakeAddress(ChainId.BSC),
    functionName: 'totalDistributed',
  })

  return cakePoolDistributed + veCakeDistributed
}

async function getCakePoolEmission() {
  const client = getViemClients({ chainId: ChainId.BSC })
  return fetchCakePoolEmission(client, ChainId.BSC)
}

function getVeCAKEPoolApr(cakePoolEmission: BigNumber, totalSupply: BigNumber) {
  return new BigNumber(new BigNumber(cakePoolEmission).div(3).times(24 * 60 * 60 * 365))
    .div(totalSupply.div(1e18))
    .times(100)
}

async function getRevShareEmissionApr(totalSupply: BigNumber) {
  const client = getViemClients({ chainId: ChainId.BSC })

  const totalDistributed = await client.readContract({
    abi: revenueSharingPoolProxyABI,
    address: getRevenueSharingVeCakeAddress(ChainId.BSC),
    functionName: 'totalDistributed',
  })
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const lastThursday = Math.floor(currentTimestamp / WEEK) * WEEK
  const revShareEmission = new BigNumber(totalDistributed.toString()).dividedBy(lastThursday - 1700697600)
  return new BigNumber(revShareEmission)
    .times(24 * 60 * 60 * 365)
    .div(totalSupply)
    .times(100)
}

async function getVeCakeTotalSupply() {
  const client = getViemClients({ chainId: ChainId.BSC })
  const data = await client.readContract({
    abi: veCakeABI,
    functionName: 'totalSupply',
    address: getVeCakeAddress(ChainId.BSC),
  })

  return typeof data !== 'undefined' ? new BigNumber(data.toString()) : BIG_ZERO
}
