import { useTheme } from '@pancakeswap/hooks'
import { useTranslation } from '@pancakeswap/localization'
import {
  Box,
  Button,
  Flex,
  FlexGap,
  Input,
  Message,
  ModalV2,
  MotionModal,
  PencilIcon,
  PreTitle,
  RiskAlertIcon,
  Text,
  useMatchBreakpoints,
  useModalV2,
  useTooltip,
  WarningIcon,
} from '@pancakeswap/uikit'
import { useUserSlippage } from '@pancakeswap/utils/user'
import { VerticalDivider } from '@pancakeswap/widgets-internal'
import { DEFAULT_SLIPPAGE_TOLERANCE, SlippageError } from 'components/Menu/GlobalSettings/TransactionSettings'

import { useAutoSlippageEnabled, useAutoSlippageWithFallback } from 'hooks/useAutoSlippageWithFallback'
import { useCallback, useState } from 'react'
import styled from 'styled-components'
import { escapeRegExp } from 'utils'
import { basisPointsToPercent } from 'utils/exchange'

const TertiaryButton = styled(Button).attrs({ variant: 'tertiary' })<{ $color: string }>`
  height: unset;
  padding: 7px 8px;
  font-size: 14px;
  border-radius: 12px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
  color: ${({ $color }) => $color};
`

const ButtonsContainer = styled(FlexGap).attrs({ flexWrap: 'wrap', gap: '4px' })`
  background-color: ${({ theme }) => theme.colors.input};
  border: 1px solid ${({ theme }) => theme.colors.inputSecondary};
  border-radius: 16px;
  width: fit-content;

  box-shadow: ${({ theme }) => theme.shadows.inset};
`

const StyledButton = styled(Button)`
  height: 40px;
  padding: 0 8px;
  ${({ theme }) => theme.mediaQueries.md} {
    padding: 0 16px;
  }
`

const StyledVerticalDivider = styled(VerticalDivider).attrs(({ theme }) => ({ bg: theme.colors.inputSecondary }))`
  margin: 0 4px;
`

interface SlippageButtonProps {
  enableAutoSlippage?: boolean
}

export const SlippageButton = ({ enableAutoSlippage = false }: SlippageButtonProps) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { isMobile } = useMatchBreakpoints()

  const { isOpen, onOpen, onDismiss } = useModalV2()

  // Calculate auto slippage
  const { slippageTolerance, isAuto } = useAutoSlippageWithFallback()
  const [userSlippageTolerance] = useUserSlippage()

  const tolerance = enableAutoSlippage ? slippageTolerance : userSlippageTolerance

  const isRiskyLow = tolerance < 50
  const isRiskyHigh = tolerance > 100
  const isRiskyVeryHigh = tolerance > 2000

  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    isRiskyLow
      ? t('Your transaction may fail. Reset settings to avoid potential loss')
      : isRiskyHigh
      ? t('Your transaction may be frontrun. Reset settings to avoid potential loss')
      : '',
    { placement: 'top' },
  )

  const color = isRiskyVeryHigh
    ? theme.colors.failure
    : isRiskyLow || isRiskyHigh
    ? theme.colors.yellow
    : theme.colors.primary60

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div ref={!isMobile ? targetRef : undefined}>
          <TertiaryButton
            $color={color}
            startIcon={
              isRiskyVeryHigh ? (
                <RiskAlertIcon color={color} width={16} />
              ) : isRiskyLow || isRiskyHigh ? (
                <WarningIcon color={color} width={16} />
              ) : undefined
            }
            endIcon={<PencilIcon color={color} width={12} />}
            onClick={onOpen}
          >
            {enableAutoSlippage && isAuto && tolerance
              ? `${t('Auto')}: ${basisPointsToPercent(tolerance).toFixed(2)}%`
              : typeof tolerance === 'number'
              ? `${basisPointsToPercent(tolerance).toFixed(2)}%`
              : tolerance}
          </TertiaryButton>
        </div>

        {(isRiskyLow || isRiskyHigh) && tooltipVisible && tooltip}
      </div>
      <SlippageSettingsModal isOpen={isOpen} onDismiss={onDismiss} enableAutoSlippage={enableAutoSlippage} />
    </>
  )
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`) // match escaped "." characters via in a non-capturing group

const SlippageSettingsModal = ({
  isOpen,
  onDismiss,
  enableAutoSlippage,
}: {
  isOpen: boolean
  onDismiss: () => void
  enableAutoSlippage?: boolean
}) => {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const [isAutoSlippageEnabled, setIsAutoSlippageEnabled] = useAutoSlippageEnabled()
  const [userSlippageTolerance, setUserSlippageTolerance] = useUserSlippage()

  const autoSlippageActive = enableAutoSlippage && isAutoSlippageEnabled

  const [slippageInput, setSlippageInput] = useState('')

  const slippageInputIsValid =
    slippageInput === '' || (userSlippageTolerance / 100).toFixed(2) === Number.parseFloat(slippageInput).toFixed(2)

  let slippageError: SlippageError | undefined
  if (slippageInput !== '' && !slippageInputIsValid) {
    slippageError = SlippageError.InvalidInput
  } else if (slippageInputIsValid && userSlippageTolerance < 50) {
    // Slippage < 0.5%
    slippageError = SlippageError.RiskyLow
  } else if (slippageInputIsValid && userSlippageTolerance > 2000) {
    // Slippage > 20%
    slippageError = SlippageError.RiskyVeryHigh
  } else if (slippageInputIsValid && userSlippageTolerance > 100) {
    // Slippage > 1%
    slippageError = SlippageError.RiskyHigh
  } else {
    slippageError = undefined
  }

  const parseCustomSlippage = useCallback((value: string) => {
    if (value === '' || inputRegex.test(escapeRegExp(value))) {
      setSlippageInput(value)

      try {
        const valueAsIntFromRoundedFloat = Number.parseInt((Number.parseFloat(value) * 100).toString())
        if (!Number.isNaN(valueAsIntFromRoundedFloat) && valueAsIntFromRoundedFloat < 5000) {
          setUserSlippageTolerance(valueAsIntFromRoundedFloat)
        }
      } catch (error) {
        console.error(error)
      }
    }
  }, [])

  return (
    <ModalV2 isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick>
      <MotionModal title={t('Slippage setting')} onDismiss={onDismiss} minHeight="100px">
        <PreTitle mb="8px">{t('Liquidity Slippage')}</PreTitle>
        <FlexGap gap="16px" justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <Box>
            <ButtonsContainer style={{ flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
              {enableAutoSlippage && (
                <StyledButton
                  scale="sm"
                  onClick={() => {
                    setSlippageInput('')
                    setIsAutoSlippageEnabled(true)
                  }}
                  variant={autoSlippageActive ? 'subtle' : 'light'}
                >
                  {t('Auto')}
                </StyledButton>
              )}
              <StyledButton
                scale="sm"
                onClick={() => {
                  setSlippageInput('')
                  setUserSlippageTolerance(10)
                  setIsAutoSlippageEnabled(false)
                }}
                variant={userSlippageTolerance === 10 && !autoSlippageActive ? 'subtle' : 'light'}
              >
                0.1%
              </StyledButton>
              <StyledButton
                scale="sm"
                onClick={() => {
                  setSlippageInput('')
                  setUserSlippageTolerance(50)
                  setIsAutoSlippageEnabled(false)
                }}
                variant={userSlippageTolerance === 50 && !autoSlippageActive ? 'subtle' : 'light'}
              >
                0.5%
              </StyledButton>
              <StyledButton
                scale="sm"
                onClick={() => {
                  setSlippageInput('')
                  setUserSlippageTolerance(100)
                  setIsAutoSlippageEnabled(false)
                }}
                variant={userSlippageTolerance === 100 && !autoSlippageActive ? 'subtle' : 'light'}
              >
                1.0%
              </StyledButton>
            </ButtonsContainer>
          </Box>

          <FlexGap gap="8px" alignItems="center">
            <Text color="textSubtle">{t('Custom')}</Text>
            <Box position="relative" width="82px">
              <Input
                scale="lg"
                inputMode="decimal"
                pattern="^[0-9]*[.,]?[0-9]{0,2}$"
                placeholder={autoSlippageActive ? 'Auto' : (userSlippageTolerance / 100).toFixed(2)}
                value={slippageInput}
                onBlur={() => {
                  parseCustomSlippage((userSlippageTolerance / 100).toFixed(2))
                }}
                onChange={(event) => {
                  if (autoSlippageActive) {
                    setIsAutoSlippageEnabled(false)
                  }
                  if (event.currentTarget.validity.valid) {
                    parseCustomSlippage(event.target.value.replace(/,/g, '.'))
                  }
                }}
                isWarning={!slippageInputIsValid}
                isSuccess={![10, 50, 100].includes(userSlippageTolerance)}
                style={{
                  paddingLeft: '12px',
                  height: '40px',
                }}
              />
              <Flex position="absolute" right="8px" top="8px" alignItems="center">
                <StyledVerticalDivider />
                <Text color="textSubtle"> %</Text>
              </Flex>
            </Box>
          </FlexGap>
        </FlexGap>

        {!autoSlippageActive && !!slippageError && (
          <Message
            mt="8px"
            variant={
              slippageError === SlippageError.InvalidInput
                ? 'primary'
                : slippageError === SlippageError.RiskyLow || slippageError === SlippageError.RiskyHigh
                ? 'warning'
                : 'danger'
            }
          >
            <Text>
              {slippageError === SlippageError.InvalidInput
                ? t('Enter a valid slippage percentage')
                : slippageError === SlippageError.RiskyLow
                ? t('Your transaction may fail')
                : t('Your transaction may be frontrun')}
              .<br />
              <Text
                as="button"
                role="button"
                onClick={() => {
                  setSlippageInput('')
                  setUserSlippageTolerance(DEFAULT_SLIPPAGE_TOLERANCE)
                }}
                style={{
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
                bold
              >
                {t('Reset slippage settings')}
              </Text>{' '}
              {t('to avoid potential loss')}.
            </Text>
          </Message>
        )}
      </MotionModal>
    </ModalV2>
  )
}
