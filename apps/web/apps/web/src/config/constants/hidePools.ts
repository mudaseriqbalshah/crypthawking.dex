import { ChainId } from '@pancakeswap/chains'

export const HIDE_POOLS: Partial<Record<ChainId, string[]>> = {
  [ChainId.BASE]: [
    '0x6d9c35f6db62d601c83056fea9b4208597f53e97cdcd6a747ceb299482b2d66e',
    '0x2a66b3b9e4c6a29e75bd2ef7b882b3771a2f9e5304e73305dd8085f4cd16839e',
    '0x07115d6b37e3dc7f45918b0e596a3d1646292c061627da1dc366d7044636c93f',
    '0x34e19068fd32b59dc649757324d827675a736f2be33ec2bef4647bf876c0f6e7',
  ],
}
