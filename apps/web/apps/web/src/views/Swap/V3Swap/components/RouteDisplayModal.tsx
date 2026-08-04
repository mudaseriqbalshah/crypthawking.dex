import { useTranslation } from '@pancakeswap/localization'
import { Route, RouteType } from '@pancakeswap/smart-router'
import {
  AtomBox,
  AutoColumn,
  Flex,
  Modal,
  ModalV2,
  QuestionHelper,
  Text,
  UseModalV2Props,
  useTooltip,
} from '@pancakeswap/uikit'
import { CurrencyLogo } from '@pancakeswap/widgets-internal'
import { memo, useMemo } from 'react'

import { RoutingSettingsButton } from 'components/Menu/GlobalSettings/SettingsModalV2'
import { CurrencyLogoWrapper, RouterBox, RouterPoolBox, RouterTypeText } from 'views/Swap/components/RouterViewer'
import { useHookDiscount } from 'views/SwapSimplify/hooks/useHookDiscount'
import { BridgeRoutesDisplay } from './RouteDisplay/BridgeRoutesDisplay'
import { getPairNodes, Pair } from './RouteDisplay/pairNode'

export type RouteDisplayEssentials = Pick<Route, 'path' | 'pools' | 'inputAmount' | 'outputAmount' | 'percent' | 'type'>

interface Props extends UseModalV2Props {
  routes: RouteDisplayEssentials[]
}

export const RouteDisplayModal = memo(function RouteDisplayModal({ isOpen, onDismiss, routes }: Props) {
  const { t } = useTranslation()
  const isBridgeRouting = routes?.some((route) => route.type === RouteType.BRIDGE)

  return (
    <ModalV2 closeOnOverlayClick isOpen={isOpen} onDismiss={onDismiss} minHeight="0">
      <Modal
        title={
          <Flex justifyContent="center">
            {t('Route')}{' '}
            <QuestionHelper
              text={t('Routing through these tokens resulted in the best price for your trade.')}
              ml="4px"
              placement="top-start"
            />
          </Flex>
        }
        style={{ minHeight: '0' }}
        bodyPadding="24px"
      >
        {isBridgeRouting ? (
          <BridgeRoutesDisplay routes={routes} />
        ) : (
          <AutoColumn gap="56px" height="100%">
            {routes.map((route, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <RouteDisplay key={i} route={route} />
            ))}
            <RoutingSettingsButton />
          </AutoColumn>
        )}
      </Modal>
    </ModalV2>
  )
})

interface RouteDisplayProps {
  route: RouteDisplayEssentials
}

export const RouteDisplay = memo(function RouteDisplay({ route }: RouteDisplayProps) {
  const { hookDiscount, category } = useHookDiscount(route.pools)
  const { t } = useTranslation()
  const { path, pools, inputAmount, outputAmount } = route
  const { currency: inputCurrency } = inputAmount
  const { currency: outputCurrency } = outputAmount
  const { targetRef, tooltip, tooltipVisible } = useTooltip(<Text>{inputCurrency.symbol}</Text>, {
    placement: 'right',
  })

  const {
    targetRef: outputTargetRef,
    tooltip: outputTooltip,
    tooltipVisible: outputTooltipVisible,
  } = useTooltip(<Text>{outputCurrency.symbol}</Text>, {
    placement: 'right',
  })

  const pairs = useMemo<Pair[]>(() => {
    if (path.length <= 1) {
      return []
    }

    const currencyPairs: Pair[] = []
    for (let i = 0; i < path.length - 1; i += 1) {
      currencyPairs.push([path[i], path[i + 1]])
    }
    return currencyPairs
  }, [path])

  const pairNodes = getPairNodes({
    pairs,
    pools,
    routePoolsLength: route.pools.length,
    hookDiscount,
    category,
    t,
    PairNode,
  })

  return (
    <AutoColumn gap="24px">
      <RouterBox justifyContent="space-between" alignItems="center">
        <CurrencyLogoWrapper
          size={{
            xs: '32px',
            md: '48px',
          }}
          ref={targetRef}
        >
          <CurrencyLogo size="100%" currency={inputCurrency} />
          <RouterTypeText fontWeight="bold">{Math.round(route.percent)}%</RouterTypeText>
        </CurrencyLogoWrapper>
        {tooltipVisible && tooltip}
        {pairNodes}
        <CurrencyLogoWrapper
          size={{
            xs: '32px',
            md: '48px',
          }}
          ref={outputTargetRef}
        >
          <CurrencyLogo size="100%" currency={outputCurrency} />
        </CurrencyLogoWrapper>
        {outputTooltipVisible && outputTooltip}
      </RouterBox>
    </AutoColumn>
  )
})

function PairNode({
  pair,
  text,
  className,
  tooltipText,
}: {
  pair: Pair
  text: string | React.ReactNode
  className: string
  tooltipText: string
}) {
  const [input, output] = pair

  const tooltip = useTooltip(tooltipText)

  return (
    <RouterPoolBox className={className}>
      {tooltip.tooltipVisible && tooltip.tooltip}
      <Flex ref={tooltip.targetRef}>
        <AtomBox
          size={{
            xs: '24px',
            md: '32px',
          }}
        >
          <CurrencyLogo size="100%" currency={input} />
        </AtomBox>
        <AtomBox
          size={{
            xs: '24px',
            md: '32px',
          }}
        >
          <CurrencyLogo size="100%" currency={output} />
        </AtomBox>
      </Flex>
      <RouterTypeText>{text}</RouterTypeText>
    </RouterPoolBox>
  )
}
