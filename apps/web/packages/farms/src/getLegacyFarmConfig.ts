import { ChainId, getChainName } from '@pancakeswap/chains'
import { getStableSwapPools } from '@pancakeswap/stable-swap-sdk'
import { supportedChainIdV4 } from './const'
import { fetchUniversalFarms } from './fetchUniversalFarms'
import { SerializedFarmConfig, SerializedFarmPublicData, UniversalFarmConfig } from './types'

/**
 * @deprecated only used for legacy farms
 */
export async function getLegacyFarmConfig(chainId?: ChainId): Promise<SerializedFarmPublicData[]> {
  // Upstream gates the legacy (V2/stable classic-MasterChef) farm config on
  // `supportedChainIdV4`, which is really "chains that ship a ./farms/<chainName>.ts
  // file" rather than anything v4-specific. BASE_SEPOLIA ships such a file
  // (./farms/baseSepolia.ts, exporting `legacyFarmConfig` for pids 0-3) but must NOT
  // join `supportedChainIdV4` — that list also drives the Merkl APR API, the explorer
  // farm-pool queries and the farmsV4/Infinity fetchers, none of which know chain
  // 84532. Allow it explicitly here instead; every other chain keeps the exact same
  // gate it had before.
  if (chainId && (supportedChainIdV4.includes(chainId as number) || chainId === ChainId.BASE_SEPOLIA)) {
    const chainName = getChainName(chainId)
    try {
      const config = await import(`./farms/${chainName}.ts`)
      let universalConfig: UniversalFarmConfig[] = await fetchUniversalFarms(chainId)
      const stablePools = chainId ? await getStableSwapPools(chainId) : []
      // eslint-disable-next-line prefer-destructuring
      const legacyFarmConfig: SerializedFarmConfig[] = config.legacyFarmConfig
      if (legacyFarmConfig && legacyFarmConfig.length > 0) {
        universalConfig = universalConfig.filter((f) => {
          return (
            !!f.pid &&
            !legacyFarmConfig.some((legacy) => legacy.lpAddress?.toLowerCase() === f.lpAddress?.toLowerCase())
          )
        })
      }

      const transformedFarmConfig: SerializedFarmConfig[] = universalConfig
        ?.filter((f) => f.pid && (f.protocol === 'v2' || f.protocol === 'stable'))
        ?.map((farm) => {
          const stablePair =
            farm.protocol === 'stable'
              ? stablePools.find((s) => s.lpAddress?.toLowerCase() === farm.lpAddress?.toLowerCase())
              : undefined
          const bCakeWrapperAddress = 'bCakeWrapperAddress' in farm ? farm.bCakeWrapperAddress : undefined

          return {
            pid: farm.pid ?? 0,
            lpAddress: farm.lpAddress,
            lpSymbol: `${farm.token0.symbol}-${farm.token1.symbol}`,
            token: farm.token0.serialize,
            quoteToken: farm.token1.serialize,
            ...{
              ...(stablePair && {
                stableSwapAddress: stablePair.stableSwapAddress,
                infoStableSwapAddress: stablePair.infoStableSwapAddress,
                stableLpFee: stablePair.stableLpFee,
                stableLpFeeRateOfTotalFee: stablePair.stableLpFeeRateOfTotalFee,
              }),
              ...(bCakeWrapperAddress && { bCakeWrapperAddress }),
            },
          } satisfies SerializedFarmConfig
        })

      return legacyFarmConfig.concat(transformedFarmConfig)
    } catch (error) {
      console.error('Cannot get farm config', error, chainId, chainName)
      return []
    }
  }

  return []
}
