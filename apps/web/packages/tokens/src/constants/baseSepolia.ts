import { ChainId } from '@pancakeswap/chains'
import { ERC20Token, WETH9 } from '@pancakeswap/sdk'

const PROJECT = 'https://dex.cryptohawking.com'

export const baseSepoliaTokens = {
  weth: WETH9[ChainId.BASE_SEPOLIA],
  // Valueless CryptoHawking test assets — Base Sepolia only.
  usdc: new ERC20Token(ChainId.BASE_SEPOLIA, '0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2', 6, 'tUSDC', 'Test USD Coin', PROJECT),
  usdt: new ERC20Token(ChainId.BASE_SEPOLIA, '0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988', 6, 'tUSDT', 'Test Tether USD', PROJECT),
  dai: new ERC20Token(ChainId.BASE_SEPOLIA, '0x66dbAe86eC0689cC398eF3f1D4486261EC1ffa07', 18, 'tDAI', 'Test Dai', PROJECT),
  wbtc: new ERC20Token(ChainId.BASE_SEPOLIA, '0xE5839C45b8c282E6786D6CC7Dc1c6aB70D5b3D70', 8, 'tWBTC', 'Test Wrapped BTC', PROJECT),
  hawk: new ERC20Token(ChainId.BASE_SEPOLIA, '0x2843bABb7557CD51e8007F8D2a960457c734C570', 18, 'HAWK', 'Crypto Hawking Token', PROJECT),
  nest: new ERC20Token(ChainId.BASE_SEPOLIA, '0x8f7BE274b5e85C4b244CAe562AeBf023f70a185f', 18, 'NEST', 'Nest Token', PROJECT),
}
