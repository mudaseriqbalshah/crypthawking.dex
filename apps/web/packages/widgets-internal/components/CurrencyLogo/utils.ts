import { ChainId } from "@pancakeswap/chains";
import { Currency, NATIVE, Token } from "@pancakeswap/sdk";
import { bscTokens, ethereumTokens } from "@pancakeswap/tokens";
import memoize from "lodash/memoize";
import { getAddress } from "viem";
import { CurrencyInfo } from "./types";

const mapping: { [key: number]: string } = {
  [ChainId.BSC]: "smartchain",
  [ChainId.ETHEREUM]: "ethereum",
  [ChainId.POLYGON_ZKEVM]: "polygonzkevm",
  [ChainId.ARBITRUM_ONE]: "arbitrum",
  [ChainId.ZKSYNC]: "zksync",
  [ChainId.BASE]: "base",
  [ChainId.LINEA]: "linea",
  [ChainId.OPBNB]: "opbnb",
};

export const getTokenLogoURL = memoize(
  (token?: Token) => {
    if (token && mapping[token.chainId]) {
      return `https://assets-cdn.trustwallet.com/blockchains/${mapping[token.chainId]}/assets/${getAddress(
        token.address
      )}/logo.png`;
    }
    return null;
  },
  (t) => `${t?.chainId}#${t?.address}`
);

export const getTokenLogoURLByAddress = memoize(
  (address?: string, chainId?: number) => {
    if (address && chainId && mapping[chainId]) {
      return `https://assets-cdn.trustwallet.com/blockchains/${mapping[chainId]}/assets/${getAddress(
        address
      )}/logo.png`;
    }
    return null;
  },
  (address, chainId) => `${chainId}#${address}`
);

export const chainName: { [key: number]: string } = {
  [ChainId.BSC]: "",
  [ChainId.ETHEREUM]: "eth",
  [ChainId.POLYGON_ZKEVM]: "polygon-zkevm",
  [ChainId.ARBITRUM_ONE]: "arbitrum",
  [ChainId.ZKSYNC]: "zksync",
  [ChainId.LINEA]: "linea",
  [ChainId.BASE]: "base",
  [ChainId.OPBNB]: "opbnb",
  [ChainId.MONAD_TESTNET]: "monad-testnet",
};

// CryptoHawking: upstream pointed these at tokens.pancakeswap.finance. We operate no
// token-image CDN, and spec §6.9 forbids requests to *.pancakeswap.* hosts, so the
// base URL is configuration-driven and yields no URL when unset — callers already
// fall back to the token list's own logoURI. See RISKS.md.
const TOKEN_IMAGE_CDN = process.env.NEXT_PUBLIC_TOKEN_IMAGE_CDN || "";

// CryptoHawking: locally-served monogram art for the tokens we deployed on Base Sepolia,
// keyed by lowercase address (see apps/web/src/utils/tokenImages.ts, which holds the same
// map for the app-level CurrencyLogo). Files live in apps/web/public/images/tokens/84532/.
const LOCAL_TOKEN_IMAGE_CHAIN_ID = 84532;
const LOCAL_TOKEN_IMAGE_ADDRESSES = new Set<string>([
  "0x4200000000000000000000000000000000000006", // WETH
  "0x582800afc82ba6c8c8b9ce3be0416e913f7e59c2", // tUSDC
  "0x85323e2368865e6dcffc8def64016a5eafe8d988", // tUSDT
  "0x66dbae86ec0689cc398ef3f1d4486261ec1ffa07", // tDAI
  "0xe5839c45b8c282e6786d6cc7dc1c6ab70d5b3d70", // tWBTC
  "0x2843babb7557cd51e8007f8d2a960457c734c570", // HAWK
  "0x8f7be274b5e85c4b244cae562aebf023f70a185f", // NEST
  "0x036cbd53842c5426634e7929541ec2318f3dcf7e", // USDC (Circle, Base Sepolia)
]);

export const getLocalTokenImage = (chainId?: number, address?: string): string | undefined => {
  if (chainId !== LOCAL_TOKEN_IMAGE_CHAIN_ID || !address) return undefined;
  const key = address.toLowerCase();
  return LOCAL_TOKEN_IMAGE_ADDRESSES.has(key) ? `/images/tokens/${chainId}/${key}.png` : undefined;
};

// TODO: move to utils or token-list
export const getTokenListBaseURL = (chainId: number) =>
  TOKEN_IMAGE_CDN ? `${TOKEN_IMAGE_CDN}/images/${chainName[chainId]}` : "";

export const getTokenListTokenUrl = (token: Pick<Token, "chainId" | "address">) =>
  TOKEN_IMAGE_CDN && Object.keys(chainName).includes(String(token.chainId))
    ? `${TOKEN_IMAGE_CDN}/images/${
        token.chainId === ChainId.BSC ? "" : `${chainName[token.chainId]}/`
      }${token.address}.png`
    : null;

const commonCurrencySymbols = [
  ethereumTokens.usdt,
  ethereumTokens.usdc,
  bscTokens.cake,
  bscTokens.usdv,
  ethereumTokens.wbtc,
  ethereumTokens.weth,
  NATIVE[ChainId.BSC],
  bscTokens.busd,
  ethereumTokens.dai,
].map(({ symbol }) => symbol);

export const getCommonCurrencyUrl = memoize(
  (currency?: Currency): string | undefined => getCommonCurrencyUrlBySymbol(currency?.symbol),
  (currency?: Currency) => `logoUrls#${currency?.chainId}#${currency?.symbol}`
);

export const getCommonCurrencyUrlBySymbol = memoize(
  (symbol?: string): string | undefined =>
    symbol && commonCurrencySymbols.includes(symbol)
      ? TOKEN_IMAGE_CDN
        ? `${TOKEN_IMAGE_CDN}/images/symbol/${symbol.toLocaleLowerCase()}.png`
        : undefined
      : undefined,
  (symbol?: string) => `logoUrls#symbol#${symbol}`
);

type GetLogoUrlsOptions = {
  useTrustWallet?: boolean;
};

export const getCurrencyLogoUrls = memoize(
  (currency: Currency | undefined, { useTrustWallet = true }: GetLogoUrlsOptions = {}): string[] => {
    const trustWalletLogo = getTokenLogoURL(currency?.wrapped);
    const logoUrl = currency ? getTokenListTokenUrl(currency.wrapped) : null;
    const localLogo = getLocalTokenImage(currency?.chainId, currency?.wrapped?.address);
    return [
      localLogo,
      getCommonCurrencyUrl(currency),
      useTrustWallet ? trustWalletLogo : undefined,
      logoUrl,
    ].filter((url): url is string => !!url);
  },
  (currency: Currency | undefined, options?: GetLogoUrlsOptions) =>
    `logoUrls#${currency?.chainId}#${currency?.wrapped?.address}#${options ? JSON.stringify(options) : ""}`
);

export const getCurrencyLogoUrlsByInfo = memoize(
  (currency: CurrencyInfo | undefined, { useTrustWallet = true }: GetLogoUrlsOptions = {}): string[] => {
    if (!currency) {
      return [];
    }
    const { chainId, address, symbol } = currency;
    const trustWalletLogo = getTokenLogoURLByAddress(address, chainId);
    const logoUrl = chainId && address ? getTokenListTokenUrl({ chainId, address }) : null;
    const localLogo = getLocalTokenImage(chainId, address);
    return [
      localLogo,
      getCommonCurrencyUrlBySymbol(symbol),
      useTrustWallet ? trustWalletLogo : undefined,
      logoUrl,
    ].filter((url): url is string => !!url);
  },
  (currency, options) =>
    `logoUrls#${currency?.chainId}#${currency?.symbol}#${currency?.address}#${options ? JSON.stringify(options) : ""}`
);
