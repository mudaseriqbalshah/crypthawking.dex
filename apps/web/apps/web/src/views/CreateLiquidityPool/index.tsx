import { useTranslation } from '@pancakeswap/localization'
import { AutoColumn, Card, CardBody, DynamicSection, Grid, Heading, Spinner } from '@pancakeswap/uikit'
import Page from 'components/Layout/Page'
import { FieldLiquidityShape } from 'components/Liquidity/Form/FieldLiquidityShape'
import { useSelectIdRouteParams } from 'hooks/dynamicRoute/useSelectIdRoute'
import { FieldBinStep } from 'views/CreateLiquidityPool/components/FieldBinStep'
import { FieldClTickSpacing } from 'views/CreateLiquidityPool/components/FieldClTickSpacing'
import { FieldFeeLevel } from 'views/CreateLiquidityPool/components/FieldFeeLevel'
import { FieldFeeTierSetting } from 'views/CreateLiquidityPool/components/FieldFeeTierSetting'
import { FieldHookSettings } from 'views/CreateLiquidityPool/components/FieldHookSettings'
import { FieldSelectCurrencies } from 'views/CreateLiquidityPool/components/FieldSelectCurrencies'
import { FieldStartingPrice } from 'views/CreateLiquidityPool/components/FieldStartingPrice'
import { BreadcrumbNav } from './components/BreadcrumbNav'
import { FieldCreateDepositAmount } from './components/FieldCreateDepositAmount'
import { FieldPoolType } from './components/FieldPoolType'
import { FieldPriceRange } from './components/FieldPriceRange'
import { MessagePoolInitialized } from './components/MessagePoolInitialized'
import { SubmitCreateButton } from './components/SubmitCreateButton'
import { useInfinityCreateFormQueryState } from './hooks/useInfinityFormState/useInfinityFormQueryState'
import { usePoolKey } from './hooks/useInfinityFormState/usePoolKey'
import { useIsPoolInitialized } from './hooks/useIsPoolInitialized'
import { ResponsiveTwoColumns } from './styles'

export const CreateLiquidityInfinityForm = () => {
  const { chainId } = useSelectIdRouteParams()
  const { t } = useTranslation()
  const { isBin, isCl, feeTierSetting } = useInfinityCreateFormQueryState()
  const poolKey = usePoolKey()
  const { data: poolInitialized } = useIsPoolInitialized(poolKey, chainId)

  // Show loading animation while we wait for chainId
  if (!chainId) {
    return (
      <Grid style={{ placeItems: 'center', minHeight: '50vh' }}>
        <Spinner />
      </Grid>
    )
  }

  return (
    <Page>
      <BreadcrumbNav chainId={chainId} />
      <Heading as="h3" scale="lg" mb="24px" mt="40px">
        {t('Create Infinity Liquidity Pool')}
      </Heading>
      <Grid gridTemplateColumns={['1fr', '1fr', '1fr', 'repeat(2, 1fr)']} style={{ gap: '24px' }}>
        <Card style={{ height: 'fit-content' }}>
          <CardBody>
            <AutoColumn gap="24px">
              <FieldSelectCurrencies />
              <ResponsiveTwoColumns>
                <FieldPoolType />
                <FieldFeeTierSetting />
              </ResponsiveTwoColumns>
              <DynamicSection disabled={feeTierSetting === 'dynamic'}>
                <FieldFeeLevel />
              </DynamicSection>
              {isBin && <FieldBinStep />}
              {isCl && <FieldClTickSpacing />}
              <FieldHookSettings />
              <MessagePoolInitialized />
            </AutoColumn>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <DynamicSection disabled={poolInitialized}>
              <AutoColumn gap={['16px', null, null, '24px']}>
                <FieldCreateDepositAmount />
                <FieldStartingPrice />
                <FieldPriceRange />
                {isBin && <FieldLiquidityShape />}
                <SubmitCreateButton />
              </AutoColumn>
            </DynamicSection>
          </CardBody>
        </Card>
      </Grid>
    </Page>
  )
}
