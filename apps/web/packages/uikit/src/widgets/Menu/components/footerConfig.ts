import { ContextApi } from "@pancakeswap/localization";
import { FooterLinkType } from "../../../components/Footer/types";

// CryptoHawking testnet: upstream footer linked out to pancakeswap.finance/docs.
// pancakeswap.finance for nearly every entry (merch store, business partnerships,
// analytics, IFOs, legacy products) — none of which exist for this fork. Own-domain
// entries (Trade/Earn) now point at dex.cryptohawking.com; entries with no
// CryptoHawking equivalent yet (docs, audits, blog, careers, bug bounty, brand
// assets) are TODO'd — see RISKS.md.
export const footerLinks: (t: ContextApi["t"]) => FooterLinkType[] = (t) => [
  {
    label: t("Ecosystem"),
    items: [
      {
        label: t("Trade"),
        href: "https://dex.cryptohawking.com/swap",
      },
      {
        label: t("Earn"),
        href: "https://dex.cryptohawking.com/liquidity/pools",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: t("HAWK Incentives"),
        // TODO(cryptohawking): no CryptoHawking docs site exists yet — see RISKS.md.
        href: "https://docs.pancakeswap.finance/ecosystem-and-partnerships/business-partnerships/syrup-pools-and-farms",
      },
      {
        label: t("Staking Pools"),
        href: "https://dex.cryptohawking.com/pools",
      },
    ],
  },
  {
    label: t("Developers"),
    items: [
      {
        label: t("Github"),
        // TODO(cryptohawking): no public CryptoHawking DEX repo/org exists yet — see RISKS.md.
        href: "https://github.com/pancakeswap",
      },
    ],
  },
  {
    label: t("Support"),
    items: [
      {
        label: t("Documentation"),
        // TODO(cryptohawking): no CryptoHawking docs site exists yet — see RISKS.md.
        href: "https://docs.pancakeswap.finance/",
      },
    ],
  },
  {
    label: t("About"),
    items: [
      {
        label: t("Tokenomics"),
        // TODO(cryptohawking): no CryptoHawking docs site exists yet — see RISKS.md.
        href: "https://docs.pancakeswap.finance/governance-and-tokenomics/cake-tokenomics",
      },
      {
        label: t("Terms Of Service"),
        href: "https://dex.cryptohawking.com/terms-of-service",
      },
    ],
  },
];
