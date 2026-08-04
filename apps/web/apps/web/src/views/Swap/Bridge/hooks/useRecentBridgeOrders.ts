import { useInfiniteQuery } from '@tanstack/react-query'
import { createQueryKey } from 'utils/reactQuery'
import { Address } from 'viem'
import { getUserBridgeOrders } from '../api'
import { BridgeStatus } from '../types'

const getRecentBridgeOrdersQueryKey = createQueryKey<'recent-bridge-orders', [address: Address]>('recent-bridge-orders')

interface UseRecentBridgeOrdersParameters {
  address?: Address
}

export const useRecentBridgeOrders = ({ address }: UseRecentBridgeOrdersParameters) => {
  return useInfiniteQuery({
    queryKey: getRecentBridgeOrdersQueryKey([address!]),
    queryFn: ({ pageParam }) => {
      if (!address) {
        throw new Error("No address provided for user's bridge orders")
      }
      return getUserBridgeOrders(address, pageParam)
    },
    enabled: !!address,
    initialPageParam: undefined,
    getNextPageParam: (lastPage: any) => {
      return lastPage.endCursor
    },
    retry: 3,
    retryDelay: 1_000,
    refetchOnMount: true,
    refetchInterval: (query) =>
      query.state.data?.pages
        .flatMap((page) => (Array.isArray(page.rows) ? page.rows.map((row) => row.status) : []))
        .find((status) => status === BridgeStatus.PENDING || status === BridgeStatus.BRIDGE_PENDING)
        ? 20_000
        : 60_000,
  })
}
