import { useTranslation } from '@pancakeswap/localization'
import { Breadcrumbs, Link, Text } from '@pancakeswap/uikit'

export type BreadcrumbNavProps = {
  chainId: number
}

// @todo @ChefJerry UI no match with design
export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ chainId }) => {
  const { t } = useTranslation()

  return (
    <Breadcrumbs mb="32px">
      <Link href="/liquidity/pools">{t('Farms')}</Link>
      <Link href="/liquidity/create">{t('Infinity')}</Link>
      <Text>{t('Create Infinity Liquidity Pool')}</Text>
    </Breadcrumbs>
  )
}
