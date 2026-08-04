import { usePreviousValue } from '@pancakeswap/hooks'
import { POOL_TYPE, PoolType } from '@pancakeswap/infinity-sdk'
import { useTranslation } from '@pancakeswap/localization'
import {
  Box,
  BoxProps,
  Button,
  ErrorIcon,
  FlexGap,
  Grid,
  Input,
  InputGroup,
  PreTitle,
  QuestionHelper,
  Text,
} from '@pancakeswap/uikit'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeeLevelQueryState } from 'state/infinity/create'
import styled from 'styled-components'
import { escapeRegExp } from 'utils'
import { useInfinityCreateFormQueryState } from '../hooks/useInfinityFormState/useInfinityFormQueryState'

export type FieldFeeLevelProps = BoxProps

const decimals = 4
const PRESET_FEE_LEVELS = [0.01, 0.05, 0.1]

const FeeLevelButton = styled(Button)`
  width: 100%;
  margin: 0 auto;
  height: 100%;
  font-size: 16px;
  border-radius: ${({ theme }) => theme.radii.default};
`

const FEE_LIMIT = {
  [POOL_TYPE.Bin]: 10,
  [POOL_TYPE.CLAMM]: 100,
}

export const isFeeOutOfRange = (fee?: number | null, poolType?: PoolType) => {
  if (!fee || !poolType) {
    return false
  }
  return poolType === POOL_TYPE.CLAMM ? fee >= FEE_LIMIT[POOL_TYPE.CLAMM] : fee >= FEE_LIMIT[POOL_TYPE.Bin]
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`) // match escaped "." characters via in a non-capturing group

export const FieldFeeLevel: React.FC<FieldFeeLevelProps> = ({ ...boxProps }) => {
  const { t } = useTranslation()
  const [feeLevel, setFeeLevel] = useFeeLevelQueryState()
  const { poolType, feeTierSetting } = useInfinityCreateFormQueryState()
  const [inputValue, setInputValue] = useState<string | null>(null)

  const tips = useMemo(() => {
    if (!feeLevel || feeTierSetting === 'dynamic') return null
    if (isFeeOutOfRange(feeLevel, poolType)) {
      return (
        <FlexGap gap="6px" mt="8px">
          <ErrorIcon color="failure" />
          <Text color="failure">
            {t('The fee must be below %amount%%', {
              amount: poolType === POOL_TYPE.CLAMM ? FEE_LIMIT[POOL_TYPE.CLAMM] : FEE_LIMIT[POOL_TYPE.Bin],
            })}
          </Text>
        </FlexGap>
      )
    }
    if (feeLevel > 0.3) {
      return (
        <FlexGap gap="6px" mt="8px">
          <ErrorIcon color="yellow" />
          <Text color="yellow">{t('Consider lowering the fee')}</Text>
        </FlexGap>
      )
    }
    return null
  }, [feeTierSetting, poolType, feeLevel, t])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let { value: v } = e.target

    v = v.replace(/,/g, '.')

    if (inputRegex.test(escapeRegExp(v))) {
      const d = v.split('.')[1]?.length
      if (d && d > decimals) return
      setInputValue(v)
    }
  }, [])

  const handleInputBlur = useCallback(() => {
    if (inputValue === null) return
    if (inputValue === '') {
      setFeeLevel(null)
      return
    }
    const value = parseFloat(inputValue)
    setFeeLevel(value)
    setInputValue(value.toString())
  }, [inputValue, setFeeLevel])

  const handleQuickSelect = useCallback(
    (presetFeeLevel: number) => {
      setFeeLevel(presetFeeLevel)
      setInputValue(presetFeeLevel.toString())
    },
    [setFeeLevel],
  )

  const prevFeeLevel = usePreviousValue(feeLevel)

  useEffect(() => {
    if (inputValue === null && feeLevel !== null) {
      setInputValue(parseFloat(feeLevel.toFixed(decimals)).toString())
    }
  }, [feeLevel, inputValue])

  useEffect(() => {
    if (prevFeeLevel !== null && feeLevel === null) {
      setInputValue(null)
    }
  }, [feeLevel, prevFeeLevel])

  return (
    <Box {...boxProps}>
      <FlexGap gap="4px">
        <PreTitle mb="8px">{t('Fee Level')}</PreTitle>
        <QuestionHelper
          placement="auto"
          mb="8px"
          color="secondary"
          text={t('Common range: 0.01% to 0.3%, Ideal range <1%')}
        />
      </FlexGap>

      <Grid
        gridTemplateColumns={['repeat(3, 0.8fr) 1fr', null, null, 'repeat(4, 1fr)']}
        gridGap={['4px', null, null, '6px']}
      >
        {PRESET_FEE_LEVELS.map((presetFeeLevel) => (
          <FeeLevelButton
            key={presetFeeLevel}
            scale={['xs', null, null, 'sm']}
            variant={feeLevel === presetFeeLevel ? 'primary' : 'secondary'}
            onClick={() => handleQuickSelect(presetFeeLevel)}
          >
            {presetFeeLevel}%
          </FeeLevelButton>
        ))}

        <InputGroup scale="sm" endIcon={<>%</>}>
          <Input
            pattern={`^[0-9]*[.,]?[0-9]{0,${decimals}}$`}
            inputMode="decimal"
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
            style={{ border: 'none', width: '100%' }}
            value={inputValue ?? ''}
            onBlur={handleInputBlur}
            onChange={handleInputChange}
          />
        </InputGroup>
      </Grid>
      {tips}
    </Box>
  )
}
