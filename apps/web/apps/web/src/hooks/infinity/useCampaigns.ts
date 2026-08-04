import { ChainId } from '@pancakeswap/chains'
import { useQueries, useQuery } from '@tanstack/react-query'
import { QUERY_SETTINGS_IMMUTABLE } from 'config/constants'
import groupBy from 'lodash/groupBy'
import { useMemo } from 'react'
import { rewardApiClient } from 'state/farmsV4/api/client'
import { operations } from 'state/farmsV4/api/schema'
import { Address } from 'viem'

interface CampaignsByPoolIdProps {
  chainId?: number
  poolIds?: Address[]
  includeInactive?: boolean
  page?: number
  fetchAll?: boolean
  result?: operations['getCampaignsByPoolId']['responses']['200']['content']['application/json']['campaigns']
}

export const fetchCampaignsByPoolIds = async ({
  chainId,
  poolIds,
  includeInactive = true,
  page = 1,
  fetchAll = false,
  result = [],
}: CampaignsByPoolIdProps) => {
  if (!chainId) {
    return []
  }
  const { data } = await rewardApiClient.GET('/farms/campaigns/{chainId}/{includeInactive}', {
    // @todo @ChefJerry remove this after the backend is ready
    baseUrl: chainId === ChainId.BSC_TESTNET ? 'https://test.v4.pancakeswap.com/' : 'https://infinity.pancakeswap.com/',
    params: {
      path: {
        chainId,
        includeInactive,
      },
      query: {
        poolIds: poolIds ?? [],
        limit: 100,
        page,
      },
    },
  })

  if (data?.campaigns) {
    result.push(...data?.campaigns)
  }
  if (fetchAll && data && data.totalRecords > result.length) {
    await fetchCampaignsByPoolIds({
      chainId,
      includeInactive,
      page: page + 1,
      fetchAll,
      result,
    })
  }
  return result
}

const fetchCampaignsByPageNo = async ({
  chainId,
  includeInactive,
  page,
  fetchAll = false,
  result = [],
}: {
  chainId: number
  includeInactive: boolean
  page: number
  fetchAll?: boolean
  result?: operations['getCampaignsByChainId']['responses']['200']['content']['application/json']['campaigns']
}) => {
  const { data } = await rewardApiClient.GET('/farms/campaigns/{chainId}/{includeInactive}', {
    // @todo @ChefJerry remove this after the backend is ready
    baseUrl: chainId === ChainId.BSC_TESTNET ? 'https://test.v4.pancakeswap.com/' : 'https://infinity.pancakeswap.com/',
    params: {
      path: {
        chainId,
        includeInactive,
      },
      query: {
        limit: 100,
        page,
      },
    },
  })
  if (data?.campaigns) {
    result.push(...data?.campaigns)
  }
  if (fetchAll && data && data.totalRecords > result.length) {
    await fetchCampaignsByPageNo({
      chainId,
      includeInactive,
      page: page + 1,
      fetchAll,
      result,
    })
  }
  return result
}

type CampaignsByChanIdProps = Omit<CampaignsByPoolIdProps, 'poolIds' | 'page' | 'fetchAll'>

export const fetchAllCampaignsByChainId = async ({ chainId, includeInactive = true }: CampaignsByChanIdProps) => {
  if (!chainId) {
    return []
  }
  return fetchCampaignsByPageNo({ chainId, includeInactive, page: 1, fetchAll: true })
}

export const useCampaignsByChainId = ({ chainId, includeInactive = false }: CampaignsByChanIdProps) => {
  const { data } = useQuery({
    queryKey: ['campaignsByChainId', chainId, includeInactive],
    queryFn: () => fetchAllCampaignsByChainId({ chainId, includeInactive }),
    enabled: !!chainId,
    retry: false,
    ...QUERY_SETTINGS_IMMUTABLE,
  })

  return data
}

type CampaignsByChainIdsProps = Omit<CampaignsByPoolIdProps, 'chainId'> & {
  chainIds: number[]
}

type CampaignsAccumulator = {
  [chainId: number]: Record<Address, Awaited<ReturnType<typeof fetchCampaignsByPoolIds>>>
}

export const useCampaignsByChainIds = ({ chainIds, includeInactive = false }: CampaignsByChainIdsProps) => {
  const queries = useMemo(
    () =>
      chainIds.map((chainId) => ({
        queryKey: ['campaignsByChainId', chainId, includeInactive],
        queryFn: () => fetchAllCampaignsByChainId({ chainId, includeInactive }),
        enabled: !!chainId,
        retry: false,
        ...QUERY_SETTINGS_IMMUTABLE,
      })),
    [chainIds, includeInactive],
  )
  return useQueries({
    queries,
    combine(result) {
      return chainIds.reduce<CampaignsAccumulator>((acc, chainId, idx) => {
        const currentResult = result[idx]?.data
        if (Array.isArray(currentResult)) {
          // eslint-disable-next-line no-param-reassign
          acc[chainId] = groupBy(currentResult, 'poolId')
        } else {
          // eslint-disable-next-line no-param-reassign
          acc[chainId] = acc[chainId] ?? {}
        }
        return acc
      }, {} as CampaignsAccumulator)
    },
  })
}
