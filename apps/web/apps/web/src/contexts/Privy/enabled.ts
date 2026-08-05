/**
 * CryptoHawking: Privy-backed social login is optional.
 *
 * We do not run a Privy app of our own and must never reuse PancakeSwap's credentials,
 * so `NEXT_PUBLIC_PRIVY_APP_ID` is unset in our deployments. When it is unset the whole
 * Privy provider tree is left unmounted and every Privy consumer falls back to an inert
 * stub (see ./hooks/useSafePrivy) — wagmi wallet flows are unaffected.
 *
 * Set `NEXT_PUBLIC_PRIVY_APP_ID` (and `NEXT_PUBLIC_PRIVY_CLIENT_ID`) at build time to get
 * the upstream behaviour back.
 *
 * This is a build-time constant: Next inlines `process.env.NEXT_PUBLIC_*` into the client
 * bundle, so the value never changes within a build and the conditional hook calls that
 * depend on it stay consistent across renders.
 */
export const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)
