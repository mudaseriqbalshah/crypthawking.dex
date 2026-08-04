import { Token } from '@pancakeswap/sdk'
import { TokenLogo } from '@pancakeswap/uikit'
import { useMemo } from 'react'
import { multiChainId, MultiChainNameExtend } from 'state/info/constant'
import { styled } from 'styled-components'
import { Address } from 'viem'
import getTokenLogoURL from '../../../../utils/getTokenLogoURL'

const StyledLogo = styled(TokenLogo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
`

export const CurrencyLogo: React.FC<
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

  // CryptoHawking: upstream PancakeSwap asset/token CDNs are never contacted
  // (spec §6.9). Logos resolve from our own token list via `src`.
  const srcFromPCS = ''

  return <StyledLogo size={size} srcs={src ? [srcFromPCS, src] : [srcFromPCS]} alt="token logo" {...rest} />
}

const DoubleCurrencyWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 32px;
`

interface DoubleCurrencyLogoProps {
  address0?: string
  address1?: string
  size?: number
  chainName?: MultiChainNameExtend
}

export const DoubleCurrencyLogo: React.FC<React.PropsWithChildren<DoubleCurrencyLogoProps>> = ({
  address0,
  address1,
  size = 16,
  chainName = 'BSC',
}) => {
  return (
    <DoubleCurrencyWrapper>
      {address0 && <CurrencyLogo address={address0} size={`${size.toString()}px`} chainName={chainName} />}
      {address1 && <CurrencyLogo address={address1} size={`${size.toString()}px`} chainName={chainName} />}
    </DoubleCurrencyWrapper>
  )
}
