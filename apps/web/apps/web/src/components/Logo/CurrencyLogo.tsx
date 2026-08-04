import { ChainId } from '@pancakeswap/chains'
import { useHttpLocations } from '@pancakeswap/hooks'
import { Currency } from '@pancakeswap/sdk'
import { WrappedTokenInfo } from '@pancakeswap/token-lists'
import { BinanceIcon, TokenLogo } from '@pancakeswap/uikit'
import { getImageUrlsFromToken } from 'components/TokenImage'
import { ASSET_CDN } from 'config/constants/endpoints'
import { useMemo } from 'react'
import { styled } from 'styled-components'
import getTokenLogoURL from '../../utils/getTokenLogoURL'

const StyledLogo = styled(TokenLogo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: 50%;
`

interface LogoProps {
  currency?: Currency
  size?: string
  style?: React.CSSProperties
  src?: string
}

export function FiatLogo({ currency, size = '24px', style }: LogoProps) {
  return (
    <StyledLogo
      size={size}
      srcs={[`${ASSET_CDN}/web/onramp/currencies/${currency?.symbol?.toLowerCase()}.png`]}
      width={size}
      style={style}
    />
  )
}

export default function CurrencyLogo({ currency, size = '24px', style, src }: LogoProps) {
  const uriLocations = useHttpLocations(currency instanceof WrappedTokenInfo ? currency.logoURI : undefined)
  // @ts-ignore
  const imageUrls = getImageUrlsFromToken(currency)
  const basicTokenImage = getBasicTokensImage(currency)

  const srcs: string[] = useMemo(() => {
    if (currency?.isNative) return []

    if (currency?.isToken) {
      const tokenLogoURL = getTokenLogoURL(currency)

      if (currency instanceof WrappedTokenInfo) {
        if (!tokenLogoURL) return [...imageUrls, ...uriLocations, basicTokenImage]
        return [...imageUrls, ...uriLocations, tokenLogoURL, basicTokenImage]
      }
      if (!tokenLogoURL) return [...imageUrls, basicTokenImage]
      return [...imageUrls, tokenLogoURL, basicTokenImage]
    }
    return []
  }, [currency, uriLocations])

  if (currency?.isNative) {
    if (currency.chainId === ChainId.BSC) {
      return <BinanceIcon width={size} style={style} />
    }
    return (
      <StyledLogo size={size} srcs={[`${ASSET_CDN}/web/native/${currency.chainId}.png`]} width={size} style={style} />
    )
  }

  return (
    <StyledLogo
      size={size}
      srcs={src ? [src, ...srcs] : srcs}
      alt={`${currency?.symbol ?? 'token'} logo`}
      style={style}
    />
  )
}

const basicTokensList = ['USDT', 'USDC', 'DAI', 'WBNB', 'WETH', 'WBTC', 'BNB', 'BUSD']

export const getBasicTokensImage = (token: Currency | undefined) => {
  if (!token) return ''
  return basicTokensList.includes(token?.symbol)
    ? `https://tokens.pancakeswap.finance/images/symbol/${token?.symbol?.toLowerCase() ?? ''}.png`
    : ''
}
