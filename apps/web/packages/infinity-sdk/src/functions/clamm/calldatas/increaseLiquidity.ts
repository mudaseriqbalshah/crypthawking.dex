import { Hex } from 'viem'
import { ACTIONS } from '../../../constants/actions'
import { CLPositionConfig } from '../../../types'
import { ActionsPlanner } from '../../../utils/ActionsPlanner'
import { encodeCLPositionModifyLiquidities } from './modifyLiquidities'

export const encodeCLPositionManagerIncreaseLiquidityCalldata = (
  tokenId: bigint,
  positionConfig: CLPositionConfig,
  liquidity: bigint,
  amount0Max: bigint,
  amount1Max: bigint,
  hookData: Hex = '0x',
  deadline: bigint
) => {
  const planner = new ActionsPlanner()
  planner.add(ACTIONS.CL_INCREASE_LIQUIDITY, [tokenId, liquidity, amount0Max, amount1Max, hookData])
  const calls = planner.finalizeModifyLiquidityWithClose(positionConfig.poolKey)
  return encodeCLPositionModifyLiquidities(calls, deadline)
}
