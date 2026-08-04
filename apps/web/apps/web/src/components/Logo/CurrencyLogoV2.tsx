import { Token } from '@pancakeswap/sdk'
import { TokenLogo } from '@pancakeswap/uikit'
import React, { useMemo } from 'react'

import { multiChainId, MultiChainNameExtend } from 'state/info/constant'
import { styled } from 'styled-components'
import getTokenLogoURL from 'utils/getTokenLogoURL'
import { Address } from 'viem'

const StyledLogo = styled(TokenLogo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
`

export const CurrencyLogoV2: React.FC<
  React.PropsWithChildren<{
    address?: string
    token?: Token
    size?: string
    chainName?: MultiChainNameExtend
  }>
> = ({ address, size = '24px', chainName = 'BSC', ...rest }) => {
  const src = useMemo(() => {
    return getTokenLogoURL(new Token(multiChainId[chainName], address as Address, 18, ''))
  }, [address, chainName])

  // CryptoHawking: upstream PancakeSwap asset/token CDNs are never contacted.
  // Logos come from our own token list resolution (`src`) only.
  const srcFromPCS = ''

  return <StyledLogo size={size} srcs={src ? [srcFromPCS, src] : [srcFromPCS]} alt="token logo" {...rest} />
}

const DoubleCurrencyWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 32px;

  img:last-child {
    margin-left: -4px;
  }
  &.farm {
    width: 48px;
    margin-right: -24px;
    img:first-child {
      margin-bottom: 14px;
    }
    img:last-child {
      margin-left: -14px;
      margin-top: 14px;
    }
    svg:last-child {
      margin-left: -14px;
      margin-top: 14px;
    }
  }
`

interface DoubleCurrencyLogoV2Props {
  address0?: string
  address1?: string
  size?: number
  chainName?: MultiChainNameExtend
  variant?: 'default' | 'farm'
}

export const DoubleCurrencyLogoV2: React.FC<React.PropsWithChildren<DoubleCurrencyLogoV2Props>> = ({
  address0,
  address1,
  size = 16,
  chainName = 'BSC',
  variant = 'default',
}) => {
  if (variant === 'default')
    return (
      <DoubleCurrencyWrapper>
        {address0 && <CurrencyLogoV2 address={address0} size={`${size.toString()}px`} chainName={chainName} />}
        {address1 && <CurrencyLogoV2 address={address1} size={`${size.toString()}px`} chainName={chainName} />}
      </DoubleCurrencyWrapper>
    )
  return (
    <DoubleCurrencyWrapper className="farm">
      {address1 && <CurrencyLogoV2 address={address1} size={`${28}px`} chainName={chainName} />}
      {address0 && <CurrencyLogoV2 address={address0} size={`${36}px`} chainName={chainName} />}
    </DoubleCurrencyWrapper>
  )
}
