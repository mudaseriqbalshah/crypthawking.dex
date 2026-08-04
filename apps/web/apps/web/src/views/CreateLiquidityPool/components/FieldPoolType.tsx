import { useTranslation } from '@pancakeswap/localization'
import {
  ArrowDropDownIcon,
  BarChartIcon,
  Box,
  BoxProps,
  CurvedChartIcon,
  DropDownContainer,
  DropDownHeader,
  DropdownMenu,
  DropdownMenuItems,
  DropdownMenuItemType,
  FlexGap,
  LinkExternal,
  PreTitle,
  QuestionHelper,
  Text,
} from '@pancakeswap/uikit'
import { useCallback, useMemo } from 'react'
import { usePoolTypeQueryState, useStartingPriceQueryState } from 'state/infinity/create'
import { useHookReset } from 'views/HookSettings/hooks/useHookReset'
import {
  useInfinityResetBinQueryState,
  useInfinityResetCLQueryState,
} from '../hooks/useInfinityFormState/useInfinityFormQueryState'

export type FieldPoolTypeProps = BoxProps

const itemKey = (item: Required<DropdownMenuItems>['items'][number]) => item.key

export const FieldPoolType: React.FC<FieldPoolTypeProps> = ({ ...boxProps }) => {
  const { t } = useTranslation()
  const [poolType, setPoolType] = usePoolTypeQueryState()
  const [, setStartPrice] = useStartingPriceQueryState()
  const resetCLQueryState = useInfinityResetCLQueryState()
  const resetBinQueryState = useInfinityResetBinQueryState()
  const resetHook = useHookReset()

  const updatePoolType = useCallback(
    (type: 'CL' | 'Bin') => {
      if (poolType === type) return
      setPoolType(type)
      setStartPrice(null)
      if (type === 'CL') {
        resetBinQueryState()
      } else {
        resetCLQueryState()
      }
      resetHook()
    },
    [poolType, resetBinQueryState, resetCLQueryState, setPoolType, setStartPrice],
  )

  const menuItems = useMemo(() => {
    return [
      {
        type: DropdownMenuItemType.BUTTON,
        key: 'CL',
        label: (
          <>
            <CurvedChartIcon id="pool-dropdown-curve" width="22" height="22" color="textSubtle" />
            {t('CLAMM')}
          </>
        ),
        onClick: () => {
          updatePoolType('CL')
        },
      },
      {
        type: DropdownMenuItemType.BUTTON,
        key: 'Bin',
        label: (
          <>
            <BarChartIcon id="pool-dropdown-bar" width="22" height="22" color="textSubtle" />
            {t('LBAMM')}
          </>
        ),
        onClick: () => {
          updatePoolType('Bin')
        },
      },
    ]
  }, [t, updatePoolType])

  return (
    <Box {...boxProps}>
      <FlexGap gap="4px">
        <PreTitle mb="8px">{t('Pool Type')}</PreTitle>
        <QuestionHelper
          placement="auto"
          mb="8px"
          color="secondary"
          text={
            <>
              {t(
                'PancakeSwap Infinity supports both CLAMM (Concentrated Liquidity AMM) and LBAMM (Liquidity Book AMM) pools.',
              )}
              <br />
              <br />
              <LinkExternal
                href="https://docs.pancakeswap.finance/trade/pancakeswap-infinity/pool-types"
                fontSize="14px"
              >
                {t('Learn More')}
              </LinkExternal>
            </>
          }
        />
      </FlexGap>
      <DropdownMenu items={menuItems} itemKey={itemKey}>
        <DropDownContainer p={0}>
          <DropDownHeader justifyContent="space-between">
            <FlexGap gap="5px" alignItems="center">
              {poolType === 'CL' && (
                <>
                  <CurvedChartIcon width="22" height="22" />
                  <Text>{t('CLAMM')}</Text>
                </>
              )}
              {poolType === 'Bin' && (
                <>
                  <BarChartIcon width="22" height="22" />
                  <Text>{t('LBAMM')}</Text>
                </>
              )}
            </FlexGap>
            <ArrowDropDownIcon className="down-icon" />
          </DropDownHeader>
        </DropDownContainer>
      </DropdownMenu>
    </Box>
  )
}
