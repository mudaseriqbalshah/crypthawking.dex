import { Currency } from '@pancakeswap/sdk'
import { RouteType } from '@pancakeswap/smart-router'
import { ChevronRightIcon, Flex, Text } from '@pancakeswap/uikit'
import { SHORT_SYMBOL } from 'components/NetworkSwitcher'
import { Fragment, memo } from 'react'
import { unwrappedToken } from 'utils/wrappedCurrency'

export default memo(function SwapRoute({ path, type }: { path?: Currency[]; type?: RouteType }) {
  return (
    <Flex flexWrap="wrap" width="100%" justifyContent="flex-end" alignItems="center">
      {path?.map((token, i) => {
        const isLastItem: boolean = i === path.length - 1
        const currency = (token.isToken && unwrappedToken(token)) || token
        return (
          // There might be same token appear more than once
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={`${currency?.symbol}_${i}`}>
            <Flex alignItems="end">
              <Text fontSize="14px" ml="0.125rem" mr="0.125rem">
                {currency?.symbol} {type === RouteType.BRIDGE ? `(${SHORT_SYMBOL[currency?.chainId]})` : ''}
              </Text>
            </Flex>
            {!isLastItem && <ChevronRightIcon color="textSubtle" width="20px" />}
          </Fragment>
        )
      })}
    </Flex>
  )
})
