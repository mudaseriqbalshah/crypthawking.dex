import { useTranslation } from '@pancakeswap/localization'
import {
  Button,
  Flex,
  Heading,
  HelpIcon,
  LinkExternal,
  PageHeader,
  Text,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import useTheme from 'hooks/useTheme'
import { memo, useCallback } from 'react'

export const Header = memo(function Header() {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const { theme } = useTheme()
  const redirectToDocs = useCallback(() => {
    if (typeof window !== 'undefined' && window) {
      window.open(
        'https://blog.pancakeswap.finance/articles/pancakeswap-rolls-out-the-position-manager-feature-on-v3',
        '_blank',
        'noopener noreferrer',
      )
    }
  }, [])

  return (
    <PageHeader style={isMobile ? { padding: '16px 0' } : undefined}>
      <Flex justifyContent="space-between" alignItems="flex-start" flexDirection="row" flexWrap="nowrap">
        <Flex
          flex="1"
          flexDirection="column"
          mr={['8px', 0]}
          alignSelf={['flex-start', 'flex-start', 'flex-start', 'center']}
        >
          <Heading
            as="h1"
            scale={isMobile ? 'md' : 'xxl'}
            color={isMobile ? 'text' : 'secondary'}
            mb={isMobile ? '8px' : '24px'}
          >
            {t('Position Manager')}
          </Heading>
          <Heading scale={isMobile ? 'md' : 'lg'} color={isMobile ? 'secondary' : 'text'}>
            {t('Automate your PancakeSwap V3 liquidity')}
          </Heading>
          {!isMobile && (
            <LinkExternal
              href="https://blog.pancakeswap.finance/articles/pancakeswap-rolls-out-the-position-manager-feature-on-v3"
              showExternalIcon={false}
            >
              <Button p="0" variant="text">
                <Text color="primary" bold fontSize="16px" mr="4px">
                  {t('Learn How')}
                </Text>
              </Button>
            </LinkExternal>
          )}
        </Flex>

        {isMobile && (
          <Button width="40px" height="40px" variant="subtle" px="16px" scale="md" onClick={redirectToDocs}>
            <HelpIcon color={theme.isDark ? '#280D5F' : 'white'} />
          </Button>
        )}
      </Flex>
    </PageHeader>
  )
})
