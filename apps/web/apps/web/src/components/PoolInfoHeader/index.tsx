import { Protocol } from '@pancakeswap/farms'
import { HookData } from '@pancakeswap/infinity-sdk'
import { useTranslation } from '@pancakeswap/localization'
import { Currency, Percent } from '@pancakeswap/sdk'
import {
  AutoColumn,
  Box,
  BscScanIcon,
  Card,
  CardBody,
  CopyButton,
  Flex,
  FlexGap,
  Link,
  MiscellaneousIcon,
  OpenNewIcon,
  SwapHorizIcon,
  Tag,
  Text,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import { formatNumber } from '@pancakeswap/utils/formatNumber'
import { CurrencyLogo, DoubleCurrencyLogo, FeeTierTooltip, Liquidity } from '@pancakeswap/widgets-internal'
import { InfinityFeeTierBreakdown } from 'components/FeeTierBreakdown'
import { LinkType, MiniUniversalFarmsOverlay } from 'components/MiniUniversalFarms/MiniUniversalFarmsOverlay'
import { getFarmAprInfo } from 'state/farmsV4/search/farm.util'
import { PoolInfo } from 'state/farmsV4/state/type'
import { getBlockExploreLink } from 'utils'
import { isInfinityProtocol } from 'utils/protocols'
import { Tooltips } from 'views/CakeStaking/components/Tooltips'
import { PoolFeaturesModal } from 'views/PoolDetail/components/PoolFeaturesModal'
import { PoolGlobalAprButtonV3 } from 'views/universalFarms/components/PoolAprButtonV3'

interface PoolInfoHeaderProps {
  poolId?: `0x${string}`
  poolInfo: PoolInfo | null | undefined
  currency0?: Currency
  currency1?: Currency
  chainId?: number
  isInverted?: boolean
  hookData?: HookData
  overrideAprDisplay?: {
    aprDisplay?: React.ReactNode
    roiCalculator?: React.ReactNode
  }
  linkType?: LinkType
  onInvertPrices?: () => void

  /** Optional override for currency0.symbol */
  symbol0?: string
  /** Optional override for currency1.symbol */
  symbol1?: string
}
export const PoolInfoHeader = ({
  poolInfo,
  currency0,
  currency1,
  symbol0,
  symbol1,
  chainId,
  poolId,
  hookData,
  isInverted,
  onInvertPrices,
  overrideAprDisplay,
  linkType,
}: PoolInfoHeaderProps) => {
  const { t } = useTranslation()

  const { isMobile, isTablet } = useMatchBreakpoints()
  const isSmallScreen = isMobile || isTablet

  const protocol = poolInfo?.protocol

  return (
    <>
      <Card innerCardProps={{ p: ['16px', '16px', '16px', '16px', '16px', '8px 24px'] }}>
        <FlexGap
          justifyContent="space-between"
          alignItems={isSmallScreen ? 'flex-start' : 'center'}
          flexDirection={isSmallScreen ? 'column' : 'row'}
          gap="16px"
        >
          <FlexGap
            gap="16px"
            justifyContent={isSmallScreen ? 'space-between' : 'flex-start'}
            flexDirection={isSmallScreen ? 'row-reverse' : 'row'}
            width="100%"
          >
            <Box>
              <MiniUniversalFarmsOverlay linkType={linkType} />
            </Box>
            <FlexGap flexDirection={['column', 'column', 'column', 'row']} flexWrap="wrap" gap="16px">
              <FlexGap
                gap="12px"
                alignItems={isSmallScreen ? 'flex-start' : 'center'}
                flexDirection={isSmallScreen ? 'column' : 'row'}
              >
                <Flex alignItems="center" justifyContent="center" position="relative">
                  <DoubleCurrencyLogo
                    currency0={currency0}
                    currency1={currency1}
                    size={36}
                    innerMargin="2px"
                    showChainLogoCurrency1
                  />
                </Flex>

                <FlexGap gap="4px" alignItems="center">
                  <Text bold fontSize={24} style={{ lineHeight: '1' }}>
                    {symbol0 ?? currency0?.symbol}
                  </Text>
                  <Text color="textSubtle" bold fontSize={24} style={{ lineHeight: '1' }}>
                    /
                  </Text>
                  <Text bold fontSize={24} style={{ lineHeight: '1' }}>
                    {symbol1 ?? currency1?.symbol}
                  </Text>
                  <Tooltips
                    content={
                      <FlexGap gap="4px" flexDirection="column" minWidth="150px">
                        {protocol && ![Protocol.InfinityCLAMM, Protocol.InfinityBIN].includes(protocol) && (
                          <FlexGap gap="16px" justifyContent="space-between" alignItems="center">
                            <FlexGap gap="4px">
                              <DoubleCurrencyLogo
                                currency0={currency0}
                                currency1={currency1}
                                size={24}
                                innerMargin="2px"
                              />
                              <Text>
                                {currency0?.symbol} / {currency1?.symbol}
                              </Text>
                            </FlexGap>

                            <FlexGap gap="4px">
                              <Link
                                target="_blank"
                                href={getBlockExploreLink(
                                  protocol === Protocol.STABLE ? poolInfo.stableSwapAddress : poolInfo.lpAddress,
                                  'address',
                                  chainId,
                                )}
                              >
                                <OpenNewIcon width={16} height={16} color="primary60" />
                              </Link>
                              <CopyButton
                                text={
                                  protocol === Protocol.STABLE
                                    ? poolInfo.stableSwapAddress ?? ''
                                    : poolInfo.lpAddress ?? ''
                                }
                                tooltipMessage={t('Token address copied')}
                                width="16px"
                                height="16px"
                              />
                            </FlexGap>
                          </FlexGap>
                        )}

                        <FlexGap gap="16px" justifyContent="space-between" alignItems="center">
                          <FlexGap gap="8px">
                            <CurrencyLogo currency={currency0} size="24px" />
                            <Text>{currency0?.symbol}</Text>
                          </FlexGap>
                          {currency0?.isToken && currency0?.wrapped?.address && (
                            <FlexGap gap="4px">
                              <Link
                                target="_blank"
                                href={getBlockExploreLink(currency0?.wrapped?.address, 'address', chainId)}
                              >
                                <OpenNewIcon width={16} height={16} color="primary60" />
                              </Link>
                              <CopyButton
                                text={currency0?.wrapped?.address ?? ''}
                                tooltipMessage={t('Token address copied')}
                                width="16px"
                                height="16px"
                              />
                            </FlexGap>
                          )}
                        </FlexGap>
                        <FlexGap gap="16px" justifyContent="space-between" alignItems="center">
                          <FlexGap gap="8px">
                            <CurrencyLogo currency={currency1} size="24px" />
                            <Text>{currency1?.symbol}</Text>
                          </FlexGap>
                          {currency1?.isToken && currency1?.wrapped?.address && (
                            <FlexGap gap="4px">
                              <Link
                                target="_blank"
                                href={getBlockExploreLink(currency1?.wrapped?.address, 'address', chainId)}
                              >
                                <OpenNewIcon width={16} height={16} color="primary60" />
                              </Link>
                              <CopyButton
                                text={currency1?.wrapped?.address ?? ''}
                                tooltipMessage={t('Token address copied')}
                                width="16px"
                                height="16px"
                              />
                            </FlexGap>
                          )}
                        </FlexGap>
                      </FlexGap>
                    }
                  >
                    <BscScanIcon width={24} height={24} color="textSubtle" style={{ cursor: 'pointer' }} />
                  </Tooltips>
                </FlexGap>
              </FlexGap>
              {poolInfo && (
                <FlexGap gap="16px" flexWrap="wrap" alignItems="center" alignContent="center">
                  {poolInfo?.protocol ? (
                    <AutoColumn rowGap="4px">
                      <Box>
                        {isInfinityProtocol(poolInfo.protocol) ? (
                          <InfinityFeeTierBreakdown
                            poolId={poolId}
                            chainId={chainId}
                            hookData={hookData}
                            infoIconVisible={false}
                            showType={false}
                          />
                        ) : (
                          <FeeTierTooltip
                            type={poolInfo.protocol}
                            percent={new Percent(poolInfo?.feeTier ?? 0n, poolInfo?.feeTierBase)}
                            dynamic={poolInfo?.isDynamicFee}
                            showType={false}
                          />
                        )}
                      </Box>
                    </AutoColumn>
                  ) : null}

                  <Liquidity.PoolFeaturesBadge
                    showPoolType
                    showPoolFeature={false}
                    showPoolTypeInfo={false}
                    showPoolFeatureInfo={false}
                    poolType={poolInfo.protocol}
                    hookData={hookData}
                    showLabel={false}
                  />

                  {hookData && (
                    <PoolFeaturesModal hookData={hookData}>
                      <Tag
                        variant="tertiary"
                        startIcon={<MiscellaneousIcon width={16} height={16} color="textSubtle" />}
                        endIcon={<>&nbsp;»</>}
                      >
                        {t('Pool Features')}
                      </Tag>
                    </PoolFeaturesModal>
                  )}
                </FlexGap>
              )}
            </FlexGap>
          </FlexGap>
          {poolInfo && (
            <FlexGap gap="16px" flexDirection={['column', null, 'row']}>
              <Box p="8px 16px" width="100%">
                <FlexGap gap="2px" alignItems="center">
                  <Text
                    fontSize={12}
                    color="textSubtle"
                    textTransform="uppercase"
                    minWidth="max-content"
                    style={{ userSelect: 'none' }}
                    bold
                  >
                    {t('Current Price')}
                  </Text>
                  <SwapHorizIcon color="primary60" onClick={onInvertPrices} style={{ cursor: 'pointer' }} />
                </FlexGap>
                <FlexGap gap="8px" alignItems="center" width="100%">
                  {poolInfo && (
                    <Text fontSize={24} bold width="max-content">
                      {formatNumber(Number(isInverted ? poolInfo.token0Price : poolInfo.token1Price), {
                        maximumSignificantDigits: 6,
                        maxDecimalDisplayDigits: 6,
                      })}
                    </Text>
                  )}

                  <Text fontSize={10} color="textSubtle" textTransform="uppercase" width="max-content">
                    {t(
                      '%symbol0% per %symbol1%',
                      isInverted
                        ? {
                            symbol0: currency0?.symbol,
                            symbol1: currency1?.symbol,
                          }
                        : {
                            symbol0: currency1?.symbol,
                            symbol1: currency0?.symbol,
                          },
                    )}
                  </Text>
                </FlexGap>
              </Box>
              <Box padding="8px 16px">
                <AutoColumn rowGap="2px">
                  <FlexGap>
                    <Text fontSize={12} bold color="textSubtle" textTransform="uppercase" width="max-content">
                      {t('Est. APR')}
                    </Text>
                    {overrideAprDisplay?.roiCalculator || (
                      <PoolGlobalAprButtonV3
                        pool={poolInfo}
                        showApyText={false}
                        color="text"
                        aprInfo={getFarmAprInfo(poolInfo.farm)}
                        fontSize="24px"
                      />
                    )}
                  </FlexGap>
                  {overrideAprDisplay?.aprDisplay || (
                    <PoolGlobalAprButtonV3
                      pool={poolInfo}
                      showApyButton={false}
                      color="text"
                      aprInfo={getFarmAprInfo(poolInfo.farm)}
                      fontSize="24px"
                    />
                  )}
                </AutoColumn>
              </Box>
            </FlexGap>
          )}
        </FlexGap>
      </Card>
    </>
  )
}
