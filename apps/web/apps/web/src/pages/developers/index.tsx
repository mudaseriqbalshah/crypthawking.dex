import { ChainId } from '@pancakeswap/chains'
import Developers from 'views/Developers'

const DevelopersPage = () => <Developers />
DevelopersPage.chains = [ChainId.BASE_SEPOLIA]
export default DevelopersPage
