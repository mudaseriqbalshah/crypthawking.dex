import { DefaultSeoProps } from 'next-seo'

export const SEO: DefaultSeoProps = {
  titleTemplate: '%s | CryptoHawking DEX',
  defaultTitle: 'CryptoHawking DEX',
  description: 'Testnet DEX on Base Sepolia — swap, LP and farm valueless test tokens.',
  twitter: {
    cardType: 'summary_large_image',
  },
  openGraph: {
    title: 'CryptoHawking DEX — Testnet on Base Sepolia',
    description: 'Testnet DEX on Base Sepolia — swap, LP and farm valueless test tokens.',
    images: [{ url: '/images/og-hero.png' }],
  },
}
