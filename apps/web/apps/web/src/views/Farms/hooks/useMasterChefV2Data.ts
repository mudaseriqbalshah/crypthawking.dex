import { getMasterChefChainId, masterChefAddresses } from '@pancakeswap/farms/src/const'
import { fetchMasterChefV2Data } from '@pancakeswap/farms/src/v2/fetchFarmsV2'
import { useQuery } from '@tanstack/react-query'
import { publicClient } from 'utils/viem'

const fetcher = (chainId?: number) => {
  if (!chainId) return Promise.resolve(null)

  // Resolve the chef's address and the client to read it on from the same place, so they
  // can't disagree: self-hosted chef chains read themselves, cross-farming chains still
  // resolve BSC exactly as before.
  const masterChefChainId = getMasterChefChainId(chainId, false)
  const masterChefAddress = masterChefAddresses[masterChefChainId as keyof typeof masterChefAddresses]

  if (!masterChefAddress) return Promise.resolve(null)

  return fetchMasterChefV2Data({
    chainId: masterChefChainId,
    provider: publicClient,
    masterChefAddress,
  })
}
export const useMasterChefV2Data = (chainId?: number) => {
  return useQuery({
    queryKey: ['masterChefV2Data', chainId],
    queryFn: () => fetcher(chainId),
    enabled: !!chainId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
