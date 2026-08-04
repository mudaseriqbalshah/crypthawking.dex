import { useTranslation, Trans } from '@pancakeswap/localization'
import { Link, Message, MessageText, Text } from '@pancakeswap/uikit'

const SunsetWarning = () => {
  const { t } = useTranslation()
  return (
    <Message variant="warning" m="16px 0">
      <MessageText>
        <Text mb="8px" small bold>
          {t('Position Managers Sunsetting — 21 June 2025, 08:00 UTC')}
        </Text>
        {t('Action required: Withdraw all positions before this time.')}
        <br />
        {t(
          'Note: After the deadline, positions will no longer be actively managed and may fall out of range, which could lead to impermanent loss.',
        )}
        <br />
        <br />
        {t(
          'Reminder: Users are responsible for managing and withdrawing their positions. PancakeSwap will not be able to recover or prevent any losses from positions left unmanaged.',
        )}
        <br />
        <br />
        <Trans
          i18nKey="For more details, read the <0>official blog post</0> or view the <1>announcement on X</1>."
          components={[
            <Link
              style={{ display: 'inline', fontSize: '14px' }}
              external
              href="https://blog.pancakeswap.finance/articles/action-required-retirement-of-position-managers-bril-defiedge-teahouse-range-and-alpaca"
            />,
            <Link
              external
              href="https://x.com/PancakeSwap/status/1925120544396963964"
              style={{ display: 'inline', fontSize: '14px' }}
            />,
          ]}
        />
      </MessageText>
    </Message>
  )
}

export default SunsetWarning
