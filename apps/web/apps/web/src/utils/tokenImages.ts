import { ChainId } from '@pancakeswap/chains'
import { Currency, getCurrencyAddress, Token, WBNB } from '@pancakeswap/sdk'
import { WrappedTokenInfo } from '@pancakeswap/token-lists'
import uriToHttp from '@pancakeswap/utils/uriToHttp'
import makeBlockiesUrl from 'blockies-react-svg/dist/es/makeBlockiesUrl.mjs'
import { getBasicTokensImage } from 'components/Logo/CurrencyLogo'
import { ASSET_CDN } from 'config/constants/endpoints'
import memoize from 'lodash/memoize'
import { isAddressEqual, safeGetAddress } from 'utils'
import { zeroAddress } from 'viem'
import getTokenLogoURL from './getTokenLogoURL'

export const tokenImageChainNameMapping = {
  [ChainId.BSC]: '',
  [ChainId.ETHEREUM]: 'eth/',
  [ChainId.POLYGON_ZKEVM]: 'polygon-zkevm/',
  [ChainId.ZKSYNC]: 'zksync/',
  [ChainId.ARBITRUM_ONE]: 'arbitrum/',
  [ChainId.LINEA]: 'linea/',
  [ChainId.BASE]: 'base/',
  [ChainId.OPBNB]: 'opbnb/',
}

export const getImageUrlFromToken = (token: Currency) => {
  let address = token?.isNative ? token.wrapped.address : token?.address
  if (token && token.chainId === ChainId.BSC && !token.isNative && isAddressEqual(token.address, zeroAddress)) {
    address = WBNB[ChainId.BSC].wrapped.address
  }

  // CryptoHawking: upstream fell back to tokens.pancakeswap.finance for any token
  // without a list logo. We contact no PancakeSwap host (spec §6.9) and run no token
  // image CDN, so this yields a URL only when one is configured. Callers already
  // prepend the token list's own logoURI (see getImageUrlsFromToken). See RISKS.md.
  const TOKEN_IMAGE_CDN = process.env.NEXT_PUBLIC_TOKEN_IMAGE_CDN || ''
  if (!token) return ''
  if (token.isNative && token.chainId !== ChainId.BSC) return `${ASSET_CDN}/web/native/${token.chainId}.png`
  return TOKEN_IMAGE_CDN
    ? `${TOKEN_IMAGE_CDN}/images/${tokenImageChainNameMapping[token.chainId]}${safeGetAddress(address)}.png`
    : ''
}

export const getImageUrlsFromToken = (token: Currency & { logoURI?: string | undefined }) => {
  const uriLocations = token?.logoURI ? uriToHttp(token?.logoURI) : []
  const imageUri = getImageUrlFromToken(token)
  return [...uriLocations, imageUri]
}

const _getCurrencyLogoSrcs = (currency: Currency & { logoURI?: string | undefined }) => {
  const allUrls = () => {
    const uriLocations = currency instanceof WrappedTokenInfo && currency.logoURI ? uriToHttp(currency.logoURI) : []
    const imageUrls = getImageUrlsFromToken(currency)
    const basicTokenImage = getBasicTokensImage(currency)

    if (currency?.isNative) return [getImageUrlFromToken(currency)]
    if (currency?.isToken) {
      const tokenLogoURL = getTokenLogoURL(currency as Token)
      if (currency instanceof WrappedTokenInfo) {
        if (!tokenLogoURL) return [...imageUrls, ...uriLocations, basicTokenImage]
        return [...imageUrls, ...uriLocations, tokenLogoURL, basicTokenImage]
      }
      if (!tokenLogoURL) return [...imageUrls, basicTokenImage]
      return [...imageUrls, tokenLogoURL, basicTokenImage]
    }
    return []
  }
  const addr = getCurrencyAddress(currency)
  const pxImage = makeBlockiesUrl(addr)
  const list = allUrls()?.filter((x) => x)
  list.push(pxImage)
  return list
}

export const getCurrencyLogoSrcs = memoize(
  _getCurrencyLogoSrcs,
  (currency) => `${currency.chainId}-${getCurrencyAddress(currency)}`,
)
