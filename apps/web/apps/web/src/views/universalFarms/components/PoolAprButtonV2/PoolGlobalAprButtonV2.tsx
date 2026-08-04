import { getCurrencyAddress } from '@pancakeswap/swap-sdk-core'
import { useModalV2 } from '@pancakeswap/uikit'
import { useCurrencyByChainId } from 'hooks/Tokens'
import { InfinityPoolInfo, PoolInfo } from 'state/farmsV4/state/type'
import { isInfinityProtocol } from 'utils/protocols'

import { CakeAprValue } from 'state/farmsV4/atom'
import { APRBreakdownModal } from '../PoolAprButton/AprBreakdownModal'
import { PoolAprButton } from '../PoolAprButton/PoolAprButton'

type PoolGlobalAprButtonProps = {
  pool: PoolInfo
  lpApr: `${number}`
  cakeApr: CakeAprValue
  merklApr: `${number}`
  detailMode?: boolean
}

export const PoolGlobalAprButtonV2: React.FC<PoolGlobalAprButtonProps> = ({
  pool,
  lpApr,
  merklApr,
  cakeApr,
  detailMode,
}) => {
  const { chainId, token0, token1 } = pool
  const currency0 = useCurrencyByChainId(getCurrencyAddress(token0), chainId)
  const currency1 = useCurrencyByChainId(getCurrencyAddress(token1), chainId)

  const APRBreakdownModalState = useModalV2()

  if (!isInfinityProtocol(pool.protocol)) {
    return (
      <PoolAprButton
        pool={pool}
        lpApr={parseFloat(lpApr) ?? 0}
        cakeApr={cakeApr}
        merklApr={parseFloat(merklApr) ?? 0}
      />
    )
  }

  return (
    <>
      <PoolAprButton
        pool={pool}
        lpApr={parseFloat(lpApr) ?? 0}
        cakeApr={cakeApr}
        merklApr={parseFloat(merklApr) ?? 0}
        onAPRTextClick={APRBreakdownModalState.onOpen}
        showApyButton={false}
      />
      {APRBreakdownModalState.isOpen ? (
        <APRBreakdownModal
          currency0={currency0}
          currency1={currency1}
          poolId={(pool as InfinityPoolInfo).poolId}
          lpApr={lpApr}
          cakeApr={cakeApr}
          tvlUSD={pool.tvlUsd}
          {...APRBreakdownModalState}
        />
      ) : null}
    </>
  )
}
