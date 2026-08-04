import { Protocol } from '@pancakeswap/farms'
import { useTheme } from '@pancakeswap/hooks'
import { useTranslation } from '@pancakeswap/localization'
import { Button, Flex, MoreIcon, SubMenu } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from '@pancakeswap/widgets-internal'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { PoolInfo } from 'state/farmsV4/state/type'
import styled, { css } from 'styled-components'
import { useAccount } from 'wagmi'
import { getPoolAddLiquidityLink, getPoolDetailPageLink, getPoolInfoPageLink } from 'utils/getPoolLink'

const BaseButtonStyle = css`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 400;
  padding: 8px 16px;
  line-height: 24px;
  height: auto;
  justify-content: flex-start;
`
const StyledButton = styled(Button)`
  ${BaseButtonStyle}
`

const StyledConnectWalletButton = styled(ConnectWalletButton)`
  ${BaseButtonStyle}
`

export const PoolListItemAction = memo(({ pool }: { pool: PoolInfo }) => {
  const { theme } = useTheme()

  return (
    <SubMenu
      style={{
        background: theme.card.background,
        borderColor: theme.colors.cardBorder,
      }}
      component={
        <Button scale="xs" variant="text">
          <MoreIcon />
        </Button>
      }
    >
      <ActionItems pool={pool} />
    </SubMenu>
  )
})

export const ActionItems = ({ pool, icon }: { pool: PoolInfo; icon?: React.ReactNode }) => {
  const { t } = useTranslation()
  const { address: account } = useAccount()

  // Define state variables for the async links
  const [infoLink, setInfoLink] = useState('')
  const [detailLink, setDetailLink] = useState('')

  const addLiquidityLink = useMemo(() => getPoolAddLiquidityLink(pool), [pool])

  // Fetch the infoLink and detailLink asynchronously
  useEffect(() => {
    const fetchLinks = async () => {
      const [infoLinkResult, detailLinkResult] = await Promise.all([
        getPoolInfoPageLink(pool),
        getPoolDetailPageLink(pool),
      ])
      setInfoLink(infoLinkResult)
      setDetailLink(detailLinkResult)
    }

    fetchLinks()
  }, [pool])

  const stopBubble = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <Flex flexDirection="column" onClick={stopBubble}>
      <NextLinkFromReactRouter to={detailLink}>
        <StyledButton scale="sm" variant="text">
          {t('View Pool Details')}
          {icon}
        </StyledButton>
      </NextLinkFromReactRouter>
      {!account ? (
        <StyledConnectWalletButton scale="sm" variant="text" />
      ) : (
        <NextLinkFromReactRouter to={addLiquidityLink}>
          <StyledButton scale="sm" variant="text">
            {t('Add Liquidity')}
            {icon}
          </StyledButton>
        </NextLinkFromReactRouter>
      )}
      {[Protocol.InfinityBIN, Protocol.InfinityCLAMM].includes(pool.protocol) ? null : (
        <NextLinkFromReactRouter to={infoLink}>
          <StyledButton scale="sm" variant="text">
            {t('View Info Page')}
            {icon}
          </StyledButton>
        </NextLinkFromReactRouter>
      )}
    </Flex>
  )
}
