import { ChainId } from '@pancakeswap/chains'
import Faucet from 'views/Faucet'

const FaucetPage = () => <Faucet />
FaucetPage.chains = [ChainId.BASE_SEPOLIA]
export default FaucetPage
