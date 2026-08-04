import { Currency, Token } from '@pancakeswap/sdk'
import {
  ImageProps,
  TokenImage as UIKitTokenImage,
  TokenPairImage as UIKitTokenPairImage,
  TokenPairImageProps as UIKitTokenPairImageProps,
  TokenPairLogo as UIKitTokenPairLogo,
} from '@pancakeswap/uikit'
import { ASSET_CDN } from 'config/constants/endpoints'
import { useMemo } from 'react'
import {
  getCurrencyLogoSrcs,
  getImageUrlFromToken,
  getImageUrlsFromToken,
  tokenImageChainNameMapping,
} from 'utils/tokenImages'

interface TokenPairImageProps extends Omit<UIKitTokenPairImageProps, 'primarySrc' | 'secondarySrc'> {
  primaryToken: Currency
  secondaryToken: Currency
  withChainLogo?: boolean
}

export const getChainLogoUrlFromChainId = (chainId: number) => `${ASSET_CDN}/web/chains/${chainId}.png`

export const TokenPairImage: React.FC<React.PropsWithChildren<TokenPairImageProps>> = ({
  primaryToken,
  secondaryToken,
  withChainLogo = false,
  ...props
}) => {
  const chainLogo = withChainLogo ? getChainLogoUrlFromChainId(primaryToken.chainId) : undefined
  return (
    <UIKitTokenPairImage
      primarySrc={getImageUrlFromToken(primaryToken)}
      secondarySrc={getImageUrlFromToken(secondaryToken)}
      chainLogoSrc={chainLogo}
      {...props}
    />
  )
}

export const TokenPairLogo: React.FC<React.PropsWithChildren<TokenPairImageProps>> = ({
  primaryToken,
  secondaryToken,
  withChainLogo = false,
  ...props
}) => {
  const chainLogo = useMemo(
    () => (withChainLogo ? [getChainLogoUrlFromChainId(primaryToken.chainId)] : []),
    [withChainLogo, primaryToken.chainId],
  )
  const primarySrcs = getCurrencyLogoSrcs(primaryToken as Currency & { logoURI?: string | undefined })
  const secondarySrcs = getCurrencyLogoSrcs(secondaryToken as Currency & { logoURI?: string | undefined })
  return (
    <UIKitTokenPairLogo primarySrcs={primarySrcs} secondarySrcs={secondarySrcs} chainLogoSrcs={chainLogo} {...props} />
  )
}

interface TokenImageProps extends ImageProps {
  token: Token
}

export const TokenImage: React.FC<React.PropsWithChildren<TokenImageProps>> = ({ token, ...props }) => {
  return <UIKitTokenImage src={getImageUrlFromToken(token)} {...props} />
}

export { getCurrencyLogoSrcs, getImageUrlFromToken, getImageUrlsFromToken, tokenImageChainNameMapping }
