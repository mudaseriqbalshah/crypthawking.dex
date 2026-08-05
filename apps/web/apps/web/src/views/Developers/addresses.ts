// Verified deployed addresses — mirrors packages/deployments/base-sepolia.json (authoritative).
// Do NOT add an address here that is not in that file.

export interface AddressEntry {
  label: string
  address: string
  /** hashes are not addresses — no explorer link */
  isHash?: boolean
}

export interface AddressGroup {
  title: string
  description: string
  entries: AddressEntry[]
}

export const ADDRESS_GROUPS: AddressGroup[] = [
  {
    title: 'Test tokens',
    description: 'Valueless ERC-20 test assets. Claim them all from the faucet.',
    entries: [
      { label: 'HAWK (Crypto Hawking Token)', address: '0x2843bABb7557CD51e8007F8D2a960457c734C570' },
      { label: 'tUSDC', address: '0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2' },
      { label: 'tUSDT', address: '0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988' },
      { label: 'tDAI', address: '0x66dbAe86eC0689cC398eF3f1D4486261EC1ffa07' },
      { label: 'tWBTC', address: '0xE5839C45b8c282E6786D6CC7Dc1c6aB70D5b3D70' },
      { label: 'Faucet', address: '0x7264a007e40E52b767B1Ec749baf5Ae1860B113f' },
    ],
  },
  {
    title: 'v2 — constant product AMM',
    description: 'Call addLiquidity on HawkingRouter to create a pair for your own token.',
    entries: [
      { label: 'HawkingFactory', address: '0x8F2F1F21AaFfEC52E6A390E922E784bEA9E7D8C4' },
      { label: 'HawkingRouter', address: '0x57B76A5a7abAF54Ba7f88b402863CD313667B380' },
      {
        label: 'initCodePairHash',
        address: '0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e',
        isHash: true,
      },
    ],
  },
  {
    title: 'v3 — concentrated liquidity',
    description: 'Mint a concentrated-liquidity position through the NonfungiblePositionManager.',
    entries: [
      { label: 'HawkingV3PoolDeployer', address: '0x2E2530dFbcb1bcCdf10Bf8Cd53179217d8264565' },
      { label: 'HawkingV3Factory', address: '0xf5c64e43dfF3CA1D6B64ebE13C857ae14fc41C61' },
      { label: 'SwapRouter', address: '0x4f8dBB1545F49CBfDeC3CC3693548f7a1FAEf17D' },
      { label: 'NonfungiblePositionManager', address: '0x85d440B2Bf52243239bb35D8BCeA865596cDc371' },
      { label: 'QuoterV2', address: '0x2D4CB92B4282A2185063Fe8D9D4DA1e88342e220' },
      { label: 'TickLens', address: '0xd0EEc8981C05AA0919C4bE972d4F3a42dC9518FD' },
      {
        label: 'poolInitCodeHash',
        address: '0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5',
        isHash: true,
      },
    ],
  },
  {
    title: 'Infinity — singleton',
    description: 'Vault-based singleton architecture with CL and Bin pool types.',
    entries: [
      { label: 'Vault', address: '0xe0785d1F460C89e6665645f7188E5E3C9E42c6b8' },
      { label: 'CLPoolManager', address: '0xA50a8A0867d7ACc239D71e6CBb0072F9c49aC87B' },
      { label: 'BinPoolManager', address: '0x1085E6a51E7e9575d3808479b0D6Fa89eAB07d9E' },
      { label: 'CLPositionManager', address: '0x4Ac28f614D735FD5c664DDbB51C9FDEc47992828' },
      { label: 'BinPositionManager', address: '0x99ddB0Cf91E45DE1fA0f15F8DC7a5F2D240574A0' },
      { label: 'CLQuoter', address: '0x8346DCbAa103Ea12c413469A7bb88d6571F7e7E9' },
      { label: 'BinQuoter', address: '0xc7DD71AAbfE5D9aE712e5093f43bA69243015bC8' },
      { label: 'UniversalRouter', address: '0x0180e61b23201479111D7595c7084Ce1D50f88d4' },
    ],
  },
  {
    title: 'Farms & staking',
    description: 'HAWK emissions for v2 LP tokens and v3 positions.',
    entries: [
      { label: 'MasterChef', address: '0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963' },
      { label: 'MasterChefV3', address: '0x8DBd87Df712413b963d921a6C928cb7212Ab84F6' },
      { label: 'NestBar', address: '0x8f7BE274b5e85C4b244CAe562AeBf023f70a185f' },
    ],
  },
  {
    title: 'Infrastructure',
    description: 'Canonical Base Sepolia infra plus our own multicall.',
    entries: [
      { label: 'WETH9 (predeploy)', address: '0x4200000000000000000000000000000000000006' },
      { label: 'Multicall3', address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
      { label: 'Permit2', address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
      { label: 'HawkingMulticall', address: '0x841631d67cf1b882383f3C469c78D69EF9a7520d' },
    ],
  },
]
