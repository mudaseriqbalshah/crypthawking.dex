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

// CryptoHawking: spec §6.9 — zero requests to *.pancakeswap.* hosts. Declared locally
// rather than imported from utils/tokenImages to avoid deepening the existing import
// cycle between these two modules.
const PANCAKE_HOST = /\/\/([a-z0-9-]+\.)*pancakeswap\.(com|finance)\//i

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
    // CryptoHawking: whatever the candidate chain resolves to, never emit a
    // *.pancakeswap.* URL (spec §6.9). Inherited token lists still carry those
    // logoURIs; the local art / blockies candidates below still resolve a logo.
    const strip = (urls: (string | undefined)[]) =>
      urls.filter((url): url is string => Boolean(url) && !PANCAKE_HOST.test(url as string))

    if (currency?.isNative) return []

    if (currency?.isToken) {
      const tokenLogoURL = getTokenLogoURL(currency)

      if (currency instanceof WrappedTokenInfo) {
        if (!tokenLogoURL) return strip([...imageUrls, ...uriLocations, basicTokenImage])
        return strip([...imageUrls, ...uriLocations, tokenLogoURL, basicTokenImage])
      }
      if (!tokenLogoURL) return strip([...imageUrls, basicTokenImage])
      return strip([...imageUrls, tokenLogoURL, basicTokenImage])
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
  // CryptoHawking: upstream hardcoded tokens.pancakeswap.finance here. We contact no
  // PancakeSwap host (spec §6.9), so this resolves only against a configured token image
  // CDN — same gate as utils/tokenImages. Callers already prepend the token list's own
  // logoURI, so an empty result just falls through to the next candidate src.
  const TOKEN_IMAGE_CDN = process.env.NEXT_PUBLIC_TOKEN_IMAGE_CDN || ''
  if (!token || !TOKEN_IMAGE_CDN) return ''
  return basicTokensList.includes(token?.symbol)
    ? `${TOKEN_IMAGE_CDN}/images/symbol/${token?.symbol?.toLowerCase() ?? ''}.png`
    : ''
}
