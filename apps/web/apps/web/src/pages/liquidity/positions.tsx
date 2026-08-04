import { SUPPORT_FARMS } from 'config/constants/supportChains'
import dynamic from 'next/dynamic'
import { NextPageWithLayout } from 'utils/page.types'
import UniversalFarmsPage from './pools'

const Page = dynamic(() => Promise.resolve(UniversalFarmsPage), {
  ssr: false,
}) as NextPageWithLayout

Page.chains = SUPPORT_FARMS
export default Page
