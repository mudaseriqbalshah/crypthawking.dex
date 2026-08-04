import { Box } from '@pancakeswap/uikit'
import PageLoader from 'components/Loader/PageLoader'
import { SelectIdRoute } from 'dynamicRoute'
import { useDefaultSelectIdRoute, useSelectIdRoute } from 'hooks/dynamicRoute/useSelectIdRoute'
import dynamic from 'next/dynamic'
import { NextPageWithLayout } from 'utils/page.types'
import { CHAIN_IDS } from 'utils/wagmi'
import { CreateLiquidityInfinityForm } from 'views/CreateLiquidityPool'

export type RouteType = typeof SelectIdRoute

const CreateLiquidityPage = () => {
  const { routeParams } = useSelectIdRoute()
  useDefaultSelectIdRoute()

  if (!routeParams) {
    return <PageLoader />
  }

  return (
    <Box my="24px">
      <CreateLiquidityInfinityForm />
    </Box>
  )
}

const Page = dynamic(() => Promise.resolve(CreateLiquidityPage), {
  ssr: false,
}) as NextPageWithLayout
Page.chains = CHAIN_IDS
Page.screen = true

export default Page
