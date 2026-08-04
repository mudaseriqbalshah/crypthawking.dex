import { chainNames, getChainName } from '@pancakeswap/chains'
import { INFINITY_SUPPORTED_CHAINS } from '@pancakeswap/infinity-sdk'
import { Native } from '@pancakeswap/sdk'
import { CAKE, USDC } from '@pancakeswap/tokens'
import { SelectIdRoute, zSelectId } from 'dynamicRoute'
import { useActiveChainId } from 'hooks/useActiveChainId'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { useRouteParams } from 'next-typesafe-url/pages'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo } from 'react'
import { z } from 'zod'

export const useSelectIdRoute = () => {
  const router = useRouter()
  const { chainId: activeChainId } = useActiveChainId()
  const native = useNativeCurrency(activeChainId)

  const { data: routeParams, error: routeError, isLoading } = useRouteParams(SelectIdRoute.routeParams)

  const replaceWithDefaultRoute = useCallback(() => {
    if (!activeChainId || !router.isReady) return
    const chainName = getChainName(activeChainId)
    console.debug('debug chainName', { chainName, activeChainId })
    const protocolName = INFINITY_SUPPORTED_CHAINS.includes(activeChainId) ? 'infinity' : 'v3'
    const currencyA = native.symbol
    const currencyB: string = CAKE[activeChainId]?.address ?? USDC[activeChainId]?.address ?? ''

    router.replace(
      {
        query: {
          ...router.query,
          selectId: [chainName, protocolName, currencyA, currencyB],
          chain: chainNames[activeChainId],
        }, // keep other query params
      },
      undefined,
      { shallow: true },
    )
  }, [activeChainId, native.symbol, router])

  return {
    replaceWithDefaultRoute,
    routeParams,
    routeError,
    isLoading,
  }
}

export const useSelectIdRouteParams = () => {
  const { routeParams } = useSelectIdRoute()
  const router = useRouter()

  const params = useMemo(() => {
    if (!routeParams || !routeParams.selectId) return null
    const [chainId, protocol, currencyIdA, currencyIdB] = routeParams.selectId
    return { chainId, protocol, currencyIdA, currencyIdB }
  }, [routeParams])

  const updateParams = useCallback(
    (p: Partial<z.infer<typeof zSelectId>>) => {
      if (!params || !Object.values(params).every((v) => v !== undefined)) return
      const hasOnlyChainId = Object.keys(p).length === 1 && 'chainId' in p && p.chainId !== params.chainId

      router.replace(
        {
          query: {
            ...router.query,
            selectId: hasOnlyChainId
              ? [
                  p.chainId!,
                  params.protocol,
                  params.protocol !== 'stableSwap' ? Native.onChain(p.chainId!).symbol : params.currencyIdA,
                  params.protocol !== 'stableSwap'
                    ? CAKE[p.chainId!]?.address ?? USDC[p.chainId!]?.address ?? params.currencyIdB
                    : params.currencyIdB,
                ]
              : [
                  p.chainId ?? params.chainId,
                  p.protocol ?? params.protocol,
                  p.currencyIdA ?? params.currencyIdA,
                  p.currencyIdB ?? params.currencyIdB,
                ],
            chain: chainNames[p.chainId ?? params.chainId],
          }, // keep other query params
        },
        undefined,
        { shallow: true },
      )
    },
    [params, router],
  )

  const switchCurrencies = useCallback(() => {
    updateParams({ currencyIdA: params?.currencyIdB, currencyIdB: params?.currencyIdA })
  }, [params, updateParams])

  return { ...params, updateParams, switchCurrencies }
}

export const useDefaultSelectIdRoute = () => {
  const { replaceWithDefaultRoute, routeParams, routeError, isLoading } = useSelectIdRoute()

  useEffect(() => {
    if (!isLoading && (!routeParams?.selectId || routeError)) {
      console.warn('replaceWithDefaultRoute', { routeParams, routeError })
      replaceWithDefaultRoute()
    }
  }, [isLoading, routeParams, replaceWithDefaultRoute, routeError])
}
