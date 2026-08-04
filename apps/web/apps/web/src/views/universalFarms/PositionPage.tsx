import { Protocol } from '@pancakeswap/farms'
import { useIntersectionObserver } from '@pancakeswap/hooks'
import { useTranslation } from '@pancakeswap/localization'
import {
  Button,
  ButtonMenu,
  ButtonMenuItem,
  Dots,
  Flex,
  FlexGap,
  HistoryIcon,
  IconButton,
  NotificationDot,
  Text,
  Toggle,
  useMatchBreakpoints,
  useModal,
} from '@pancakeswap/uikit'
import { useExpertMode } from '@pancakeswap/utils/user'
import {
  INetworkProps,
  ITokenProps,
  Liquidity,
  toTokenValue,
  toTokenValueByCurrency,
} from '@pancakeswap/widgets-internal'
import TransactionsModal from 'components/App/Transactions/TransactionsModal'
import GlobalSettings from 'components/Menu/GlobalSettings'
import { SettingsMode } from 'components/Menu/GlobalSettings/types'
import { ASSET_CDN } from 'config/constants/endpoints'
import { V3_MIGRATION_SUPPORTED_CHAINS } from 'config/constants/supportChains'
import { useAtom } from 'jotai'
import flatten from 'lodash/flatten'
import intersection from 'lodash/intersection'
import NextLink from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getKeyForPools, useAccountStableLpDetails, useAccountV2LpDetails, useV2PoolsLength } from 'state/farmsV4/hooks'
import { POSITION_STATUS } from 'state/farmsV4/state/accountPositions/type'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

import ConnectWalletButton from 'components/ConnectWalletButton'
import { isInfinityProtocol } from 'utils/protocols'
import { usePoolFeatureAndType } from 'views/AddLiquiditySelector/hooks/usePoolTypeQuery'
import {
  AddLiquidityButton,
  Card,
  IPoolsFilterPanelProps,
  PoolsFilterPanel,
  PositionItemSkeleton,
  StablePositionItem,
  CardBody as StyledCardBody,
  CardHeader as StyledCardHeader,
  useSelectedProtocols,
  V2PositionItem,
} from './components'
import { useFilterToQueries } from './hooks/useFilterToQueries'
import { useInfinityPositionItems } from './hooks/useInfinityPositions'
import { MAINNET_CHAINS } from './hooks/useMultiChains'
import { positionEarningAmountAtom } from './hooks/usePositionEarningAmount'
import { useV3PositionItems } from './hooks/useV3Positions'

const ToggleWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-direction: row;

  ${({ theme }) => theme.mediaQueries.lg} {
    align-items: flex-start;
  }
`
const ButtonWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ControlWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 8px;
  width: 100%;

  ${({ theme }) => theme.mediaQueries.lg} {
    width: auto;
    justify-content: flex-end;
    margin-top: 0;
  }
`

const CardBody = styled(StyledCardBody)`
  padding: 24px;

  ${({ theme }) => theme.mediaQueries.sm} {
    padding: 24px;
  }

  gap: 8px;
  background: ${({ theme }) => theme.colors.dropdown};
  border-bottom-left-radius: ${({ theme }) => theme.radii.card};
  border-bottom-right-radius: ${({ theme }) => theme.radii.card};
`

const CardHeader = styled(StyledCardHeader)`
  padding-bottom: 0;
`

const StyledButtonMenu = styled(ButtonMenu)<{ $positionStatus: number }>`
  & button {
    padding: 0 12px;
  }
  & button[variant='text']:nth-child(${({ $positionStatus }) => $positionStatus + 1}) {
    color: ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 967px) {
    width: 100%;
  }
`

const SubPanel = styled(Flex)`
  padding: 16px;
  justify-content: space-between;
  align-items: center;
  align-content: center;
  row-gap: 16px;
  flex-wrap: wrap;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  margin: 24px -24px 0;

  ${({ theme }) => theme.mediaQueries.sm} {
    margin: 24px -24px 0;
  }
`

const useV2Positions = ({
  selectedNetwork,
  selectedTokens,
  positionStatus,
  farmsOnly,
}: {
  selectedNetwork: INetworkProps['value']
  selectedTokens: ITokenProps['value']
  positionStatus: POSITION_STATUS
  farmsOnly: boolean
}) => {
  const { address: account } = useAccount()
  const { data: v2Positions, pending: v2Loading } = useAccountV2LpDetails(allChainIds, account)
  const filteredV2Positions = useMemo(
    () =>
      v2Positions.filter(
        (pos) =>
          selectedNetwork.includes(pos.pair.chainId) &&
          (!selectedTokens?.length ||
            selectedTokens.some(
              (token) => token === toTokenValue(pos.pair.token0) || token === toTokenValue(pos.pair.token1),
            )) &&
          [POSITION_STATUS.ALL, POSITION_STATUS.ACTIVE].includes(positionStatus) &&
          (!farmsOnly || pos.isStaked),
      ),
    [farmsOnly, selectedNetwork, selectedTokens, v2Positions, positionStatus],
  )
  const { data: poolsLength } = useV2PoolsLength(allChainIds)
  const v2PositionList = useMemo(
    () =>
      filteredV2Positions.map((pos) => {
        const {
          chainId,
          liquidityToken: { address },
        } = pos.pair
        const key = getKeyForPools({
          chainId,
          poolAddress: address,
        })
        return <V2PositionItem key={key} data={pos} poolLength={poolsLength[chainId]} />
      }),
    [filteredV2Positions, poolsLength],
  )
  return {
    v2Loading,
    v2PositionList,
  }
}

const useStablePositions = ({
  selectedNetwork,
  selectedTokens,
  positionStatus,
  farmsOnly,
}: {
  selectedNetwork: INetworkProps['value']
  selectedTokens: ITokenProps['value']
  positionStatus: POSITION_STATUS
  farmsOnly: boolean
}) => {
  const { address: account } = useAccount()
  const { data: stablePositions, pending: stableLoading } = useAccountStableLpDetails(allChainIds, account)

  const filteredStablePositions = useMemo(
    () =>
      stablePositions.filter(
        (pos) =>
          selectedNetwork.includes(pos.pair.liquidityToken.chainId) &&
          (!selectedTokens?.length ||
            selectedTokens.some(
              (token) =>
                token === toTokenValueByCurrency(pos.pair.token0) || token === toTokenValueByCurrency(pos.pair.token1),
            )) &&
          [POSITION_STATUS.ALL, POSITION_STATUS.ACTIVE].includes(positionStatus) &&
          (!farmsOnly || pos.isStaked),
      ),
    [farmsOnly, selectedNetwork, selectedTokens, stablePositions, positionStatus],
  )

  const stablePositionList = useMemo(
    () =>
      filteredStablePositions.map((pos) => {
        const {
          liquidityToken: { chainId, address },
        } = pos.pair
        const key = getKeyForPools({ chainId, poolAddress: address })
        return <StablePositionItem key={key} data={pos} />
      }),
    [filteredStablePositions],
  )
  return {
    stableLoading,
    stablePositionList,
  }
}

const EmptyListPlaceholder = ({ text, imageUrl }: { text: string; imageUrl?: string }) => {
  const { address: account } = useAccount()

  return (
    <FlexGap alignItems="center" flexDirection="column" gap="16px">
      <img
        width={156}
        height={179}
        alt="empty placeholder"
        src={imageUrl ?? `${ASSET_CDN}/web/universalFarms/empty_list_bunny.png`}
      />
      <Text fontSize="14px" color="textSubtle" textAlign="center">
        {text}
      </Text>
      {!account ? <ConnectWalletButton /> : null}
    </FlexGap>
  )
}

const allChainIds = MAINNET_CHAINS.map((chain) => chain.id)
const NUMBER_OF_FARMS_VISIBLE = 10

export const PositionPage = () => {
  const { t } = useTranslation()
  const { address: account } = useAccount()
  const [expertMode] = useExpertMode()

  const { observerRef, isIntersecting } = useIntersectionObserver()
  const [cursorVisible, setCursorVisible] = useState(NUMBER_OF_FARMS_VISIBLE)
  const { replaceURLQueriesByFilter, ...filters } = useFilterToQueries()
  const { features, isSelectAllFeatures, isSelectAllProtocols, protocols } = usePoolFeatureAndType()
  const { isMobile, isMd } = useMatchBreakpoints()

  const { selectedProtocolIndex, selectedNetwork, selectedTokens, positionStatus, farmsOnly } = filters

  const poolsFilter = useMemo(
    () => ({
      selectedProtocolIndex,
      selectedNetwork,
      selectedTokens,
    }),
    [selectedProtocolIndex, selectedNetwork, selectedTokens],
  )
  const selectedPoolTypes = useSelectedProtocols(selectedProtocolIndex)
  const [onPresentTransactionsModal] = useModal(<TransactionsModal />)

  const setPositionStatus = useCallback(
    (status: POSITION_STATUS) => {
      replaceURLQueriesByFilter({
        ...filters,
        positionStatus: status,
      })
    },
    [filters, replaceURLQueriesByFilter],
  )

  const toggleFarmsOnly = useCallback(() => {
    replaceURLQueriesByFilter({
      ...filters,
      farmsOnly: !farmsOnly,
    })
  }, [filters, farmsOnly, replaceURLQueriesByFilter])

  const handleFilterChange: IPoolsFilterPanelProps['onChange'] = useCallback(
    (newFilters) => {
      replaceURLQueriesByFilter({
        ...filters,
        ...newFilters,
      })
    },
    [filters, replaceURLQueriesByFilter],
  )

  const { infinityPositionList, infinityLoading } = useInfinityPositionItems({
    selectedNetwork,
    selectedTokens,
    positionStatus,
    farmsOnly,
  })
  const { v3PositionList, v3Loading } = useV3PositionItems({
    selectedNetwork,
    selectedTokens,
    positionStatus,
    farmsOnly,
  })
  const { v2PositionList, v2Loading } = useV2Positions({
    selectedNetwork,
    selectedTokens,
    positionStatus,
    farmsOnly,
  })
  const { stablePositionList, stableLoading } = useStablePositions({
    selectedNetwork,
    selectedTokens,
    positionStatus,
    farmsOnly,
  })

  const sectionMap = useMemo(() => {
    const allProtocols = isSelectAllProtocols || !protocols.length
    return {
      [Protocol.InfinityCLAMM]: infinityPositionList,
      [Protocol.V3]: allProtocols ? v3PositionList : [],
      [Protocol.V2]: allProtocols ? v2PositionList : [],
      [Protocol.STABLE]: allProtocols ? stablePositionList : [],
    }
  }, [isSelectAllProtocols, protocols, infinityPositionList, v3PositionList, v2PositionList, stablePositionList])

  const allPositionList = useMemo(() => {
    return flatten(Object.values(sectionMap))
  }, [sectionMap])

  const visibleList = useMemo(
    () =>
      selectedPoolTypes
        .filter(
          (type) =>
            !!sectionMap[type] &&
            // pool type and pool feature filter
            (isSelectAllFeatures || !features.length || isInfinityProtocol(type)),
        )
        .reduce((acc, type) => acc.concat(sectionMap[type]), [])
        .slice(0, cursorVisible),
    [selectedPoolTypes, sectionMap, cursorVisible, isSelectAllFeatures, features.length],
  )

  const mainSection = useMemo(() => {
    if (!account) {
      return <EmptyListPlaceholder text={t('Please Connect Wallet to view positions.')} />
    }
    if (infinityLoading && v3Loading && v2Loading && stableLoading) {
      return (
        <>
          <PositionItemSkeleton />
          <Text color="textSubtle" textAlign="center">
            <Dots>{t('Loading')}</Dots>
          </Text>
        </>
      )
    }

    if (!infinityLoading && !v3Loading && !v2Loading && !stableLoading && !visibleList.length) {
      return <EmptyListPlaceholder text={t('Empty page: No results found.')} />
    }
    return visibleList
  }, [account, infinityLoading, v3Loading, v2Loading, stableLoading, visibleList, t])

  useEffect(() => {
    if (isIntersecting) {
      setCursorVisible((numberCurrentlyVisible) => {
        if (Array.isArray(mainSection) && numberCurrentlyVisible <= mainSection.length) {
          return Math.min(numberCurrentlyVisible + NUMBER_OF_FARMS_VISIBLE, allPositionList.length)
        }
        return numberCurrentlyVisible
      })
    }
  }, [isIntersecting, mainSection, allPositionList.length])

  const [, setPositionEarningAmount] = useAtom(positionEarningAmountAtom)
  useEffect(() => {
    // clear position earning data when account update
    setPositionEarningAmount({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  return (
    <Card>
      <CardHeader p={isMobile ? '16px' : undefined}>
        <PoolsFilterPanel onChange={handleFilterChange} value={poolsFilter}>
          {(isMobile || isMd) && <AddLiquidityButton scale="sm" height="40px" width="100%" />}
          {isMobile ? (
            <ControlWrapper>
              <ToggleWrapper>
                <Text>{t('Farms only')}</Text>
                <Toggle checked={farmsOnly} onChange={toggleFarmsOnly} scale="sm" />
              </ToggleWrapper>
              <ButtonWrapper>
                <IconButton onClick={onPresentTransactionsModal} variant="text" scale="xs">
                  <HistoryIcon color="textSubtle" width="24px" />
                </IconButton>
                <NotificationDot show={expertMode}>
                  <GlobalSettings mode={SettingsMode.SWAP_LIQUIDITY} scale="xs" />
                </NotificationDot>
              </ButtonWrapper>
            </ControlWrapper>
          ) : null}
        </PoolsFilterPanel>
        <SubPanel>
          <StyledButtonMenu
            $positionStatus={positionStatus}
            activeIndex={positionStatus}
            onItemClick={setPositionStatus}
            variant="text"
            scale="sm"
          >
            <ButtonMenuItem>{t('All')}</ButtonMenuItem>
            <ButtonMenuItem>{t('Active')}</ButtonMenuItem>
            <ButtonMenuItem>{t('Inactive')}</ButtonMenuItem>
            <ButtonMenuItem>{t('Closed')}</ButtonMenuItem>
          </StyledButtonMenu>
          {!isMobile ? (
            <ControlWrapper>
              <ToggleWrapper>
                <Text>{t('Farms only')}</Text>
                <Toggle checked={farmsOnly} onChange={toggleFarmsOnly} scale="sm" />
              </ToggleWrapper>
              <ButtonWrapper>
                <IconButton onClick={onPresentTransactionsModal} variant="text" scale="xs">
                  <HistoryIcon color="textSubtle" width="24px" />
                </IconButton>
                <NotificationDot show={expertMode}>
                  <GlobalSettings mode={SettingsMode.SWAP_LIQUIDITY} scale="xs" />
                </NotificationDot>
              </ButtonWrapper>
            </ControlWrapper>
          ) : null}
          {/* <ButtonContainer>
            <NextLink href={LIQUIDITY_PAGES.infinity.ADD_LIQUIDITY_SELECT}>
              <Button endIcon={<AddIcon color="invertedContrast" />} scale="sm" style={{ whiteSpace: 'nowrap' }}>
                {t('Add Liquidity')}
              </Button>
            </NextLink>
          </ButtonContainer> */}
        </SubPanel>
      </CardHeader>
      <CardBody>
        {mainSection}
        {selectedPoolTypes.length === 1 && selectedPoolTypes.includes(Protocol.V2) ? (
          <Liquidity.FindOtherLP>
            {!!intersection(V3_MIGRATION_SUPPORTED_CHAINS, selectedNetwork).length && (
              <NextLink style={{ marginTop: '8px' }} href="/migration">
                <Button id="migration-link" variant="secondary" scale="sm">
                  {t('Migrate to V3')}
                </Button>
              </NextLink>
            )}
          </Liquidity.FindOtherLP>
        ) : null}
        {Array.isArray(mainSection) && mainSection.length > 0 && <div ref={observerRef} />}
      </CardBody>
    </Card>
  )
}
