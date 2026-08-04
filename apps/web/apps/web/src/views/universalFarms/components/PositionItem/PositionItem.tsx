import { Column, Flex, useMatchBreakpoints } from '@pancakeswap/uikit'
import { TokenPairLogo } from 'components/TokenImage'
import { CHAIN_QUERY_NAME } from 'config/chains'
import { PERSIST_CHAIN_KEY } from 'config/constants'
import { useRouter } from 'next/router'
import React, { PropsWithChildren, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { addQueryToPath } from 'utils/addQueryToPath'
import { PositionInfo, PositionInfoProps } from './PositionInfo'
import { PositionItemSkeleton } from './PositionItemSkeleton'
import { Container } from './styled'

type PositionItemProps = PositionInfoProps

export const PositionItem: React.FC<PropsWithChildren<PositionItemProps>> = (props) => {
  const { isDesktop } = useMatchBreakpoints()
  const { link, currency0, currency1, chainId, children, miniMode = !isDesktop } = props

  const router = useRouter()
  const linkWithChain = useMemo(
    () =>
      link
        ? addQueryToPath(link, {
            chain: CHAIN_QUERY_NAME[chainId],
            [PERSIST_CHAIN_KEY]: '1',
          })
        : link,
    [link, chainId],
  )
  const handleItemClick = useCallback(() => {
    if (!linkWithChain) {
      return
    }
    router.push(linkWithChain)
  }, [router, linkWithChain])

  if (!(currency0 && currency1)) {
    return <PositionItemSkeleton />
  }

  const content = (
    <Container $withLink={Boolean(linkWithChain)}>
      {!miniMode && (
        <TokenPairLogo
          width={48}
          height={48}
          variant="inverted"
          primaryToken={currency0}
          secondaryToken={currency1}
          withChainLogo
        />
      )}
      <DetailsContainer>
        <Column gap="8px">
          <PositionInfo {...props} />
        </Column>
        <Column justifyContent="flex-end">{children}</Column>
      </DetailsContainer>
    </Container>
  )

  if (!linkWithChain) {
    return content
  }
  return (
    <div
      onClick={handleItemClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleItemClick()
        }
      }}
    >
      {content}
    </div>
  )
}

const DetailsContainer = styled(Flex)`
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSubtle};

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
  }
`
