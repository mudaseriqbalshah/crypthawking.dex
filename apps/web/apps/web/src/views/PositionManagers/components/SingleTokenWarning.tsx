import { useTranslation, Trans } from '@pancakeswap/localization'
import { Message, MessageText, Text, Link } from '@pancakeswap/uikit'
import { memo } from 'react'

export const SingleTokenWarning: React.FC<{ strategyInfoUrl?: string }> = memo(({ strategyInfoUrl }) => {
  const { t } = useTranslation()

  return (
    <Message variant="primary" mt="15px">
      <MessageText>
        <Trans
          i18nKey="Single token deposits only. The final position may consist with both tokens. Learn more about the strategy <0>here</0>"
          components={
            strategyInfoUrl
              ? [
                  <Link
                    bold
                    external
                    m="0 4px"
                    fontSize={14}
                    color="secondary"
                    display="inline-block !important"
                    href={strategyInfoUrl}
                    style={{ textDecoration: 'underline' }}
                  />,
                ]
              : []
          }
        />
      </MessageText>
    </Message>
  )
})
