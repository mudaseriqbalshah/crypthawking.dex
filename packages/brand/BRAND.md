# CryptoHawking Brand — extracted 2026-08-04

Source of truth for the DEX theme. Extracted from the **live** parent site
(https://cryptohawking.com, Next.js, compiled CSS chunk
`/_next/static/css/553b866e390df882.css`) — not invented.

**vibe.cryptohawking.com did not resolve in DNS on 2026-08-04** — nothing could be
extracted from it. Logged in RISKS.md; re-extract when it goes live.

Legend: ✔ = confirmed from live site · ⚠ = fallback value (parent site does not
define it), logged in RISKS.md as "guessed, needs designer confirmation".

## CSS custom properties found on the live site ✔

The site is Tailwind-compiled; only these non-Tailwind custom properties exist:

```css
--font-playfair: "Playfair Display", "Playfair Display Fallback";
--hub-bg: #0a0a0f;                 /* near-black base surface */
--hub-primary: #a855f7;            /* purple-500 — matches meta theme-color */
--hub-primary: #f59e0b;            /* amber variant — scoped to Academy hub sections */
--hub-accent: #ec4899;             /* pink-500 */
--hub-accent: #fbbf24;             /* amber variant — Academy hub */
--hub-font-display: var(--font-playfair), Georgia, serif;   /* hub pages only */
--hub-font-display: ui-sans-serif, system-ui, sans-serif;   /* default */
```

There is no exposed Tailwind config; tokens below are read from compiled utility
classes and computed styles on the rendered page.

## Color

| Token | Value | Status |
|---|---|---|
| primary | `#A855F7` (purple-500) | ✔ meta theme-color + `--hub-primary` |
| primaryBright (hover/focus) | `#C084FC` (purple-400) | ✔ used in gradients (`#c084fc→#f472b6`) |
| primaryDark (pressed) | `#7E22CE` (purple-700) | ✔ appears as gradient-from |
| accentPink | `#EC4899` (pink-500) | ✔ `--hub-accent`, CTA gradients, heading glow |
| secondary (links/positive accent) | `#22D3EE` / `#06B6D4` (cyan) | ✔ gradient stops, "Web3 Architect" headline treatment |
| accentIndigo | `#6366F1` | ✔ CTA gradient terminus |
| accentGold (HAWK/rewards) | `#F59E0B` | ✔ hub amber variant; reserve for HAWK/farm rewards in DEX |
| background | `#0A0A0F` | ✔ `--hub-bg` |
| backgroundAlt / card / input / dropdown / tertiary | `#12121A` / `#14141C` / `#1C1C26` / `#16161F` / `#1F1F2B` | ⚠ fallback — parent uses translucent glass over gradients, not flat surface hexes |
| cardBorder | `rgba(255,255,255,0.10)` | ✔ computed on secondary buttons/cards (fallback purple-tinted `rgba(168,85,247,0.14)` also acceptable) |
| glassFill | `rgba(255,255,255,0.05)` | ✔ computed on secondary buttons/chips |
| text | `#FFFFFF` body, `#EDEDF2` acceptable | ✔ computed body color is pure white |
| textSubtle | `#9A9AAE` | ⚠ fallback |
| textDisabled | `#5A5A6B` | ⚠ fallback |
| success / warning / failure / info | `#22C55E` / `#F59E0B` / `#EF4444` / `#22D3EE` | ✔ Tailwind palette in use on site (`#22c55e`, `#eab308/#f59e0b`, `#ef4444`, cyan) |

## Gradients ✔

The signature is **pink→purple→indigo**, not Pancake's bubblegum (delete those):

```css
/* primary CTA (live site, left-to-right) */
gradientPrimary:    linear-gradient(to right, #EC4899, #A855F7, #6366F1);
/* alt CTA seen on "Start Learning" */
gradientAlt:        linear-gradient(to right, #06B6D4, #A855F7, #EC4899);
/* vertical accents */
gradientVertical:   linear-gradient(180deg, #A855F7, #EC4899);
gradientVerticalSoft: linear-gradient(180deg, #C084FC, #F472B6);
/* hero: deep purple→magenta wash over #0A0A0F with radial glows */
gradientHero:       radial-gradient(1200px 600px at 50% -20%, rgba(168,85,247,0.22), transparent 70%);  /* ⚠ approximation of the screenshotted hero wash */
```

## Type

- **Body + headings: system sans** — `ui-sans-serif, system-ui, sans-serif, …emoji` ✔
  (computed on rendered h1 and body; no webfont for UI text)
- **Headings: weight 900, letter-spacing normal** ✔ — plus a **neon glow**
  treatment on display headings (purple/pink text-shadow) ✔ (screenshot)
- **Playfair Display** is loaded via next/font but scoped to hub/editorial
  sections (`--hub-font-display`) ✔ — use sparingly in the DEX, if at all
  (e.g. marketing/landing copy only). NOT for app UI.
- Numbers/prices in the DEX: `tabular-nums` always. ⚠ (DEX rule, not extractable)
- Scale 12/14/16/20/24/32/40/56. ⚠ fallback (site uses standard Tailwind scale)

## Shape & depth

- Radius: `.5rem` (8px), `10px`, `.75rem` (12px), `1rem` (16px), `9999px` pill ✔
  → DEX mapping: sm 8 · md 12 · lg 16 · card 20 ⚠ (20px card is fallback) · pill 999
- Signature glow shadow ✔: `0 0 20px rgba(168,85,247,.4), 0 0 40px rgba(236,72,153,.2)`
- Card/surface treatment ✔: **glassy** — translucent white fill (5%) over dark
  gradient washes, 1px `rgba(255,255,255,0.1)` border, `backdrop-blur(12px)`
  (blur(4px) variant also in use). Not flat, not heavily bordered.
- Focus ring ⚠: `0 0 0 3px rgba(168,85,247,0.35)`

## Buttons ✔ (computed from live site)

| Kind | Fill | Border | Radius | Text |
|---|---|---|---|---|
| Primary CTA | `linear-gradient(to right, #EC4899, #A855F7, #6366F1)` | none | pill | white, semibold |
| Secondary | `rgba(255,255,255,0.05)` glass | `1px solid rgba(255,255,255,0.10)` | pill | white |
| Chip/tag | glass fill, thin purple-tinted border | thin | pill | mono/small |

Hover/pressed states not directly extractable from static CSS ⚠ — use
primaryBright `#C084FC` shift + stronger glow on hover, primaryDark `#7E22CE`
pressed.

## Logo / mark ✔

- `reference/logo.jpg` (600×600) — circular avatar-style mark inside a
  gold/dark ring. Wordmark: "Crypto Hawking" set in the UI sans, purple with
  neon glow, beside the circular mark (see `reference/parent-desktop.png`).
- No standalone vector wordmark lockup found; OG image URL 404s ⚠ — DEX needs
  its own OG image and an SVG-ized mark (flagged in RISKS.md).

## Mode

Dark-first ✔ (parent site is dark-only). DEX ships dark as default, builds
light mode too, remembers the user's choice.

## Reference captures

- `reference/parent-desktop.png` (1440w, full page)
- `reference/parent-mobile.png` (390w, full page)
- `reference/logo.jpg` (600×600)
