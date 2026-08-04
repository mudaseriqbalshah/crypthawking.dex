import { useMemo } from 'react'
import { useAccount } from 'wagmi'

export enum BoostStatus {
  UpTo,
  farmCanBoostButNot,
  Boosted,
  CanNotBoost,
}

export const useBoostStatusPM = (haveBCakeWrapper?: boolean, boostMultiplier?: number) => {
  const { address: account } = useAccount()
  const farmCanBoost = haveBCakeWrapper
  const status = useMemo(() => {
    if (!account && !farmCanBoost) return BoostStatus.CanNotBoost
    if (!account && farmCanBoost) return BoostStatus.UpTo
    if (farmCanBoost) return (boostMultiplier ?? 0) > 1 ? BoostStatus.Boosted : BoostStatus.farmCanBoostButNot
    return BoostStatus.CanNotBoost
  }, [account, farmCanBoost, boostMultiplier])

  return {
    status,
  }
}
