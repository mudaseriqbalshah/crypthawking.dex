# Privy social-login disable — production crash fix

## Symptom

`dex.cryptohawking.com` rendered `Application error: a client-side exception has occurred`.
Server HTML was correct (`<title>Exchange | CryptoHawking DEX</title>`); the crash happened
client-side, during hydration.

## Reproduction (local, pre-fix prod build)

`next start -p 3100` on the existing `.next` build, then headless browser on `/swap`:

- title: `Application error: a client-side exception has occurred`
- bodyChars 127
- `400 https://auth.privy.io/api/v1/apps/clcryptohawking0000dummy0`
- `400 https://auth.privy.io/api/v1/apps/clcryptohawking0000dummy0/smart_wallets`

## Thrower

The Privy provider tree itself — `PrivyProvider` / `SmartWalletsProvider`
(`src/contexts/Privy/privy.tsx`) mounted against the dummy app id added in 443ef41. Privy's
app-config fetch 400s (the app does not exist), the provider fails to initialise, and the
failure surfaces as an unrecoverable client exception in the **production** build only —
Next's pages-router `componentDidCatch` swaps in `/_error`.

Notably `next dev` with the same dummy id renders fine (same 400s, no crash), which is why
the dummy-id workaround looked green locally. Dev tolerates the failure; the prerendered +
hydrated production build does not.

Secondary finding: `.env.development` / `.env.example` still carried **PancakeSwap's real
Privy app id and client id** (`cm9jd1prg03msl80mz1jnuv9f`, `client-WY5iumRX…`) — that is why
a dev run showed `auth.privy.io/apps/cm9jd1prg…` and a CSP naming `pancakeswap.finance`.
Both files are now scrubbed (project rule: no upstream credentials).

## Fix

Social login is now genuinely opt-in, keyed on a build-time constant.

- `src/contexts/Privy/enabled.ts` (new) — `export const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)`.
- `src/contexts/Privy/hooks/useSafePrivy.ts` (new) — `useSafePrivy` / `useSafeWallets` /
  `useSafeSmartWallets`. When disabled they return inert stubs instead of calling Privy
  hooks (which throw outside a provider). The flag is inlined at build time, so the
  hook-call branch is constant per bundle and rules-of-hooks holds.
- `src/Providers.tsx` — when disabled, mounts neither `FirebaseAuthProvider` nor
  `PrivyProvider`/`WagmiWithPrivyProvider`; uses wagmi's own `WagmiProvider`. The rest of the
  provider tree is shared, unchanged.
- `src/contexts/Privy/firebase.tsx` — `useFirebaseAuth()` returns an inert context instead of
  throwing when no provider is mounted and Privy is disabled (`useAuth()` calls it on every page).
- Consumers switched to the safe wrappers: `components/Menu/UserMenu/index.tsx`,
  `components/WalletModalV2/WalletModal.tsx`, `hooks/useAuth.tsx`, `hooks/useSecurityBlocking.ts`,
  `contexts/Privy/hooks/usePrivyWalletAddress.ts`,
  `contexts/Privy/hooks/usePrivySmartAccountConnector.ts`, `pages/swap/index.tsx`.
- `src/contexts/Privy/privy.tsx` — dummy-id fallback from 443ef41 **reverted**; the appId is
  now read straight from env, since the component only mounts when the env var is set.
- `.env.example`, `.env.development` — upstream PancakeSwap Privy credentials removed,
  replaced with commented-out placeholders.

`privy.tsx` and `provider.tsx` keep their direct `@privy-io` imports; they are only mounted on
the enabled path, so upstream behaviour is unchanged when a real app id is supplied.

## Verification

`COREPACK_HOME=/tmp/corepack corepack pnpm build` from `apps/web`: **29/29 tasks successful**,
`✓ Compiled successfully`, `✓ Generating static pages (32/32)`, 6m07s, 0 failures.

`next start -p 3100` on the fresh build, headless browser:

| page | title | app error | privy.io requests | banner |
|---|---|---|---|---|
| `/swap`   | `Exchange | CryptoHawking DEX` | no | **0** | yes |
| `/farms`  | `Farms | CryptoHawking DEX`    | no | **0** | yes |
| `/faucet` | `CryptoHawking DEX`            | no | **0** | yes |

`pageerror` count: 0. Swap quote form renders: 2 decimal inputs + "Connect Wallet".
`privy.io` request count asserted via `performance.getEntriesByType('resource')`.

Remaining console 404s are pre-existing missing static assets unrelated to this change
(`/web/wallets/*.png`, `/web/chains/84532.png`, `/undefined/v1/routes`) — present in the
pre-fix dev run too.

`tsc --noEmit -p tsconfig.json` in `apps/web/apps/web`: **0 errors, exit 0** over 3048 project
files. (The quoted 31-error baseline must come from a wider scope; no new errors either way.)

## Concerns

- `contexts/Privy/constants.ts` still calls `initializeApp()` with PancakeSwap's
  `pancakeswap-prod-firebase` project config at module scope, and `.env.development` still
  holds upstream `NEXT_PUBLIC_FIREBASE_*` keys. With social login disabled nothing calls
  `getAuth()`, so no network traffic results, but the config values are still upstream's and
  should be removed or made lazy in follow-up work.
- The enabled path (real Privy app id) is untested — we have no Privy app to test against.
