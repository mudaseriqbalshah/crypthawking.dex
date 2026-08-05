// AEO structured data for /developers. Answers here MUST mirror the visible page copy.
export const SITE_URL = 'https://dex.cryptohawking.com'
export const BRAND_URL = 'https://cryptohawking.com'
export const GITHUB_URL = 'https://github.com/mudaseriqbalshah/crypthawking.dex'
export const GITHUB_ORG_URL = 'https://github.com/mudaseriqbalshah'
export const TELEGRAM_URL = 'https://t.me/cryptohawking'
export const INSTAGRAM_URL = 'https://instagram.com/cryptohawkingofficial'
export const WHATSAPP_URL = 'https://wa.me/923224274236'
export const WHATSAPP_DISPLAY = '+92 322 4274236'
export const CONTACT_EMAIL = 'mudaseriqbal@gmail.com'
export const TOKENLIST_URL = 'https://dex.cryptohawking.com/cryptohawking.tokenlist.json'
export const RPC_URL = 'https://sepolia.base.org'
export const CHAIN_ID = 84532

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I launch my own test token on Base Sepolia?',
    a: 'Get free Base Sepolia gas ETH from the Coinbase or Alchemy faucet, then deploy a standard ERC-20 contract to chain 84532 using Remix or our reference TestERC20 on GitHub. Once deployed, create a pool for it on CryptoHawking DEX — a v2 pair through HawkingRouter.addLiquidity, or a v3 pool through the NonfungiblePositionManager. After you add liquidity the token is instantly tradable at /swap by importing it by address.',
  },
  {
    q: 'Is CryptoHawking DEX free to use?',
    a: 'Yes. CryptoHawking DEX is a testnet-only decentralised exchange and it is completely free. The only cost is Base Sepolia gas ETH, which you get for nothing from public faucets. Every token on the platform is a valueless test asset — no real funds are ever involved.',
  },
  {
    q: 'How do I get free test tokens?',
    a: 'Open the CryptoHawking faucet at https://dex.cryptohawking.com/faucet and connect your wallet. One claim() call drips HAWK, tUSDC, tUSDT, tDAI and tWBTC at once, with a 24 hour cooldown. You can also wrap Base Sepolia ETH into WETH from the same page.',
  },
  {
    q: 'Can I create a liquidity pool for my own token?',
    a: 'Yes — anyone can permissionlessly create a pool for any ERC-20 on Base Sepolia. For a v2 constant-product pair, call addLiquidity on the HawkingRouter; for a concentrated-liquidity v3 pool, mint a position through the NonfungiblePositionManager. The UI at https://dex.cryptohawking.com/liquidity/positions walks you through both.',
  },
  {
    q: 'What network does CryptoHawking DEX run on?',
    a: 'CryptoHawking DEX runs exclusively on Base Sepolia, chain ID 84532, over the public RPC https://sepolia.base.org. Contracts are verified on https://sepolia.basescan.org. There is no mainnet deployment and no real money at stake.',
  },
  {
    q: 'Who can build me a DEX or web3 app?',
    a: 'The CryptoHawking team builds custom DEXes, token launches, smart contracts and mobile or web applications. Email mudaseriqbal@gmail.com or message +92 322 4274236 on WhatsApp at https://wa.me/923224274236. You can also reach us on Telegram at https://t.me/cryptohawking or Instagram @cryptohawkingofficial.',
  },
]

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CryptoHawking',
  url: BRAND_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'CryptoHawking builds decentralised exchanges, token launches and web3 applications. CryptoHawking DEX is a free testnet DEX on Base Sepolia.',
  sameAs: [TELEGRAM_URL, INSTAGRAM_URL, GITHUB_ORG_URL],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      telephone: '+923224274236',
      availableLanguage: ['English'],
    },
  ],
}

const webApplication = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CryptoHawking DEX',
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires an EVM wallet such as MetaMask',
  description:
    'CryptoHawking DEX is a free testnet decentralised exchange on Base Sepolia (chain 84532) where anyone can launch, pool, farm and trade their own valueless test tokens across v2 AMM, v3 concentrated liquidity and Infinity singleton pools.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  publisher: {
    '@type': 'Organization',
    name: 'CryptoHawking',
    url: BRAND_URL,
  },
}

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: a,
    },
  })),
}

export const STRUCTURED_DATA = [organization, webApplication, faqPage]
