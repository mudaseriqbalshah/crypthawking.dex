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

const PANCAKE_HOST = /\/\/([a-z0-9-]+\.)*pancakeswap\.(com|finance)\//i

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
  // CryptoHawking: our own Base Sepolia token art, served from public/ (lowercase address).
  const localLogo = getLocalTokenImage(token.chainId, address)
  if (localLogo) return localLogo
  return TOKEN_IMAGE_CDN
    ? `${TOKEN_IMAGE_CDN}/images/${tokenImageChainNameMapping[token.chainId]}${safeGetAddress(address)}.png`
    : ''
}

// CryptoHawking: locally-served monogram art for the tokens we deployed on Base Sepolia.
// Keyed by lowercase address so the path is stable across checksum casing and on
// case-sensitive filesystems. Files live in public/images/tokens/84532/.
const LOCAL_TOKEN_IMAGE_CHAIN_IDS = new Set<number>([ChainId.BASE_SEPOLIA])
const LOCAL_TOKEN_IMAGE_ADDRESSES = new Set<string>([
  '0x4200000000000000000000000000000000000006', // WETH
  '0x582800afc82ba6c8c8b9ce3be0416e913f7e59c2', // tUSDC
  '0x85323e2368865e6dcffc8def64016a5eafe8d988', // tUSDT
  '0x66dbae86ec0689cc398ef3f1d4486261ec1ffa07', // tDAI
  '0xe5839c45b8c282e6786d6cc7dc1c6ab70d5b3d70', // tWBTC
  '0x2843babb7557cd51e8007f8d2a960457c734c570', // HAWK
  '0x8f7be274b5e85c4b244cae562aebf023f70a185f', // NEST
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e', // USDC (Circle, Base Sepolia)
])

export const getLocalTokenImage = (chainId?: number, address?: string): string => {
  if (!chainId || !address || !LOCAL_TOKEN_IMAGE_CHAIN_IDS.has(chainId)) return ''
  const key = address.toLowerCase()
  return LOCAL_TOKEN_IMAGE_ADDRESSES.has(key) ? `/images/tokens/${chainId}/${key}.png` : ''
}

export const getImageUrlsFromToken = (token: Currency & { logoURI?: string | undefined }) => {
  const uriLocations = token?.logoURI ? uriToHttp(token?.logoURI) : []
  const imageUri = getImageUrlFromToken(token)
  // CryptoHawking: inherited/remote token lists still carry *.pancakeswap.* logoURIs.
  // Spec §6.9 forbids requests to those hosts, so drop them here — the remaining
  // candidates (our local art, then blockies) still resolve a logo.
  return [...uriLocations, imageUri].filter((url) => url && !PANCAKE_HOST.test(url))
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
  // CryptoHawking: token lists inherited from upstream still carry
  // tokens.pancakeswap.finance `logoURI`s. We contact no PancakeSwap host (spec §6.9),
  // so drop those candidates — the remaining ones (list logo, configured CDN, blockies)
  // still resolve a logo.
  const list = allUrls()?.filter((x) => x && !PANCAKE_HOST.test(x))
  list.push(pxImage)
  return list
}

export const getCurrencyLogoSrcs = memoize(
  _getCurrencyLogoSrcs,
  (currency) => `${currency.chainId}-${getCurrencyAddress(currency)}`,
)
