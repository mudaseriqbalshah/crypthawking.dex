export const faucetAbi = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'dripCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'drips',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'address' }, { type: 'uint256' }, { type: 'uint8' }],
  },
  { name: 'lastClaim', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'cooldown', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const
export const weth9DepositAbi = [
  { name: 'deposit', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
] as const
export const FAUCET_ADDRESS = '0x7264a007e40E52b767B1Ec749baf5Ae1860B113f' as const
