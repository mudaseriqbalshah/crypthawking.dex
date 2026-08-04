import { atom, useAtomValue } from 'jotai'
import { AdPicks } from '../Ads/AdPicks'
import { AdSlide, PicksConfig } from '../types'

// CryptoHawking: the ad panel is disabled and we run no picks CMS. Upstream fetched
// this from proofs.pancakeswap.com; we resolve to null so no PancakeSwap host is hit.
const picksConfigAtom = atom(async () => {
  const proofApi = process.env.NEXT_PUBLIC_PROOF_API
  if (!proofApi) return null

  const time = Math.floor((Date.now() / 1000) * 60 * 5) // Cache 5min
  const showPreviewVersion = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'
  const url = `${proofApi}/picks/${showPreviewVersion ? 'today-preview' : 'today'}.json?t=${time}`
  try {
    const response = await fetch(url)
    const json = await response.json()
    return json as PicksConfig
  } catch (ex) {
    return null
  }
})
export const usePicksConfig = () => {
  const picksConfig = useAtomValue(picksConfigAtom)

  if (!picksConfig) {
    return []
  }

  const adList: AdSlide[] = picksConfig.configs.map((config, i) => {
    return {
      id: `pick-${config.poolId}`,
      component: <AdPicks config={config} index={i} />,
    }
  })
  return adList
}
