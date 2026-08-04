import { atomFamily } from 'jotai/utils'
import { atom } from 'jotai'
import { ChainId } from '@pancakeswap/chains'
import isEqual from 'lodash/isEqual'
import { MANAGER } from '@pancakeswap/position-managers'

type DisableCheckKey = {
  chainId: number
  id: string | number
  manager: MANAGER
}

const DISABLED_VAULTS_CONFIG: {
  byChainAndId: Partial<Record<ChainId, number[]>>
  byManagerName: MANAGER[]
} = {
  // Disable by specific chainId and id
  byChainAndId: {
    // 56: [35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  },

  // Disable by manager (applies across all chains)
  byManagerName: Object.values(MANAGER),
}

function isDisabledByManager(managerName: MANAGER) {
  return DISABLED_VAULTS_CONFIG.byManagerName.includes(managerName)
}

function isDisabledByChainAndId(chainId: number, id: number) {
  return Boolean(DISABLED_VAULTS_CONFIG.byChainAndId[chainId]?.includes(id) ?? false)
}

export const disableAddingLiquidityAtom = atomFamily(
  (key: DisableCheckKey) =>
    atom(() => {
      return isDisabledByChainAndId(key.chainId, Number(key.id)) || isDisabledByManager(key.manager)
    }),
  isEqual,
)
