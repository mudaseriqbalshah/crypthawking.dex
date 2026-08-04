import type { InfinityCLPositionDetail } from 'state/farmsV4/state/accountPositions/type'
import { InfinityCLPositionItem } from './InfinityCLPositionItem'

export const InfinityPositionList = ({ positions }: { positions: InfinityCLPositionDetail[] }) => {
  return positions.map((position) => <InfinityCLPositionItem detailMode key={position.tokenId} data={position} />)
}
