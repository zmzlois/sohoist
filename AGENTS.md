# AGENTS.md

This file is for AI coding agents (Cursor, Copilot, Claude, Codex, etc.) operating in this repository. Read this before making any product decisions, writing copy, designing UI, or adding features.

> `CLAUDE.md` is a symlink to this file — one source of truth for all agents.

---

## The Karpathy 4

1. **Ask, don't assume.** If something is unclear or underspecified, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.

2. **Simplest solution first.** Always implement the simplest thing that could work. Do not add abstractions, layers, or flexibility that weren't explicitly requested.

3. **Don't touch unrelated code.** If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.

4. **Flag uncertainty explicitly.** If you are not confident about an approach, a library's behavior, or a technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.

---

## Priority 
- We prioritise assets and features for `apps/native` but `apps/web` should also be considered. 
- `apps/web`'s design should also be mobile focused 
- 

## Session & Memory Rules

### Maintain MEMORY.md per project folder

- Memory lives **per folder**. No root `MEMORY.md`. Read the `MEMORY.md` for the folder you're in before starting.
- Decision template:
  ```
  ## [YYYY-MM-DD] — [Decision]
  **What was decided:** ...
  **Why:** ...
  **What was rejected:** ...
  ```
- **Cross-cutting decisions** live in the **primary actor's** `MEMORY.md`. The other folder carries a one-line cross-ref.
- Failure log at `ERRORS.md` (root). Update it when an approach takes >2 attempts to work.
- Never contradict a logged decision without flagging it first.

### End-of-session summary

When I say "session end", "wrapping up", or "let's stop here", write a session summary to `MEMORY.md`:

```
## Session Summary — [Date]
**Worked on:** [what we focused on]
**Completed:** [what's finished]
**In progress:** [what's started but not done]
**Decisions made:** [key choices from this session]
**Next session:** [what to pick up first and any important context to carry forward]
```

### Maintain ERRORS.md

When an approach takes more than 2 attempts to work, log it:

```
## [Task type or description]
**What didn't work:** [approaches that failed and why]
**What worked:** [the approach that finally succeeded]
**Note for next time:** [anything worth remembering for similar tasks]
```

Check `ERRORS.md` before suggesting approaches to similar tasks. If a task matches a logged failure, say so and skip to what worked.

### Always show exactly what changed

After completing any coding task, always end with:

- **Files changed:** [list every file touched]
- **What was modified:** [one line per file]
- **Files intentionally not touched:** [if relevant]
- **Follow-up needed:** [anything requiring my attention or a decision]

---

## Brand Overview

**Sohoist** is a private introduction network for low-stakes dating, matched by real-life vibe. Members are rewarded after they've been in a verified relationship for 6 months.

The product should feel like:
- A private members' club
- An editorial dating dossier
- A trusted circle of friends
- A quiet concierge introduction service
- A refined social club for meaningful relationships

The product should **not** feel like:
- A swipe-based dating app
- A public dating marketplace
- A bounty board
- A matchmaking casino
- A loud consumer social app
- A crypto/payment product

Core positioning:

> Low-stakes dating, matched by real-life vibe.

Supporting line:

> A private introduction network where trusted people make thoughtful matches.

Short product description:

> Sohoist is a private network for meaningful introductions. Members meet through trusted people, real-world context, and thoughtful referrals — not endless swiping.

---

## Copywriting Tonality

### Brand Voice

Sohoist should sound: discreet, warm, editorial, human, refined, trustworthy, low-pressure, socially intelligent, slightly old-world but still modern.

The tone should feel like: a private invitation, a friend making a thoughtful introduction, an editorial note, a concierge welcome, a quiet members' club.

Avoid sounding: desperate, transactional, overly romantic, growth-hacky, too "dating app", too finance/marketplace-like.

### Copy Principles

**Use understated language.**

Good: `Meet through people who know your vibe.`
Bad: `Find your soulmate today.`

Good: `Private introductions. Real-world chemistry. Meaningful connection.`
Bad: `Get matched with hot singles near you.`

Good: `Thoughtful introductions for meaningful connections.`
Bad: `Pay friends to find your perfect partner.`

**Make privacy the default.**

Use: "Private by default." / "Discretion is built in." / "You control what's visible." / "Only trusted people can refer." / "Your profile is never public unless you choose."

---

## What This Product Is

**Sohoist** (formerly wing-men.cc) is an intentional matchmaking platform — the antithesis of swipe culture. Matches come exclusively through real friends who refer people they genuinely know. No algorithm selects strangers. No infinite scroll. No dopamine loops.

Your friends are your wing men. They vouch for you, introduce you, and confirm you've found someone.

---

## Core Mechanics

### 1. Voice Onboarding

Users create their profile through a natural voice conversation with an AI. Not forms. Not checkboxes. The AI extracts who you are, what you're looking for, your values and lifestyle, your dealbreakers. The result is a profile that reads like a person — not a resume.

### 2. Relationship Bounty

Before activating their public profile, users deposit money ($100–$2,000) into escrow. This is their **relationship bounty** — a financial signal of how seriously they're looking. Funds are held in trust and released only after 6 months in a verified relationship. This is the core trust mechanism: it aligns incentives and filters for people who are genuinely ready.

### 3. Social Graph Introductions

Users are introduced exclusively through mutual connections — people who know both parties. Introductions carry context: how long someone has known you, how they know you, what they'd say about you. "Through friends, not algorithms."

### 4. Relationship Verification

When a relationship begins, both parties confirm it. Then their mutual friends confirm it too. Only after 6 months of confirmed relationship status does the escrow release. Friends are the verification layer — they protect against gaming the system.

---

## Data Model (Conceptual)

These are the entities that matter for product decisions:

- **User** — profile built from voice onboarding; name, age, location, occupation, MBTI (optional), height (optional), bio, relationship intent
- **Bounty** — amount deposited, deposit tier (full/half/minimum), escrow status, payout date (6 months after relationship confirmed)
- **Profile** — public-facing version of a user; shareable link; displays bounty as a trust signal
- **Referral** — a wingman's introduction: who made it, their relationship to both parties, any context they provided
- **Relationship** — a confirmed pairing; confirmed by both users + at least one mutual friend; tracks start date, confirmation status
- **Verification** — individual confirmation records from users and their friends

The Convex schema (`packages/backend/convex/schema.ts`) currently only has `notes`. New tables for the above will be added as features are built.

---

## Logo System

Primary mark: single **S** inside a thin circular frame, slightly imperfect pencil-circle effect, graphite color, optional fog-blue watercolor wash behind.

Three lockups:
1. **Primary horizontal** — `[ S ] Sohoist / PRIVATE INTRODUCTIONS`
2. **Compact** — `[ S ] Sohoist / BY INTRODUCTION`
3. **Icon only** — S inside pencil circle — use for app icon, favicon, social avatar, small badges

Avoid: heart symbols, swipe icons, flames, neon gradients, overly geometric SaaS logos.

---

## Color Palette

Ratio: ~70% Paper/Warm Ivory · 15% Ink/Stone · 10% Fog Blue/Muted Teal · 5% Dust Lavender/Warm Amber.

| Token | Hex | Use |
|---|---|---|
| Paper | `#F5EFE6` | Main background, page canvas, app shell |
| Warm Ivory | `#EFE7DC` | Cards, surfaces, mobile panels |
| Fog Blue | `#DCE6EA` | Trust moments, watercolor washes, calm backgrounds |
| Stone Graphite | `#5D5A57` | Dividers, icon strokes, secondary text |
| Soft Ink | `#2B2A28` | Primary text, headlines, CTA buttons |
| Dust Lavender | `#B8AFC9` | Subtle emotional accents, secondary highlights |
| Muted Teal | `#8FAFB3` | Links, active states, trust badges |
| Warm Amber | `#D6B56D` | Highlights, human warmth, subtle CTA accents |

Avoid: pure white, pure black (except CTAs), bright pink/red, saturated gradients, neon.

CSS custom properties and Tailwind tokens are defined in `apps/web/src/app/globals.css`. React Native tokens in `apps/native/src/theme.ts`.

---

## Typography

**Display / headlines** — `Cormorant Garamond`, weight 400, `letter-spacing: -0.02em`, `line-height: 1.05`. Hero, section titles, profile names, quote cards.

**Italic / emotional** — `Cormorant Garamond Italic`, weight 400, `letter-spacing: -0.01em`. Taglines, pull quotes, editorial captions.

**Body / UI** — `Inter`, weight 400, 14px, `line-height: 1.55`. Body copy, form labels, buttons, nav, all UI text.

**Small labels** — `Inter Medium`, weight 500, 11px, `letter-spacing: 0.08em`, uppercase. Section labels, nav items, status labels, badges.

**Data / mono** — `IBM Plex Mono`, 400/500, 13px. Member counts, city counts, trust metrics. Example: `Introductions: 842 | Cities: 12`

Sentence case throughout. No ALL CAPS except small labels.

---

## Layout Principles

**Desktop**: `max-width: 1180px`, `padding-inline: 32px`, 12-column grid `column-gap: 24px`. Hero vertical padding 96–128px. Section padding 72–96px. Clear section numbers, thin graphite dividers, large whitespace.

**Mobile**: screen padding 20px, card padding 16–20px, section gap 20–28px, title top spacing 48–72px, bottom CTA height 52–56px.

**Dividers**: `border-color: rgba(93, 90, 87, 0.18)` — pencil rules, not hard UI borders.

Avoid: dense dashboards, heavy card stacking, loud marketing modules, high-contrast SaaS sections.

---

## Design Language

Agents generating UI must adhere to this aesthetic. Do not deviate toward generic modern app UI patterns.

**Feeling**: intimate, warm, handcrafted, intentional. Like a letter written by hand, not a notification from an app.

**Visual style**:
- Backgrounds: warm paper `#F5EFE6`
- Pencil sketch / watercolor illustration style for hero visuals and onboarding
- Profile portraits as hand-drawn pencil sketches, not photos
- City/network as an illustrated map with glowing nodes (`image.png` in `packages/assets/`)

**UI components**:
- Paper cards: `linear-gradient(180deg, rgba(255,252,244,0.94), rgba(250,243,232,0.90))`, `border-radius: 20px`, soft warm border, `box-shadow: 0 12px 40px rgba(70,50,30,0.08)`, `inset 0 1px 0 rgba(255,255,255,0.72)`
- Primary CTA: dark graphite pill `#2B2A28`, `border-radius: 999px`, `height: 44px`, paper-colored text `#F5EFE6`
- Secondary: ghost pill `border: 1px solid rgba(43,42,40,0.22)`, transparent background
- Badges: fog-blue tinted `rgba(220,230,234,0.72)`, `border-radius: 999px`, 11px uppercase
- Icon stroke: `stroke-width: 1.25px`, color `#5D5A57`. Never filled dating icons.
- Verified/confirmed states: subtle checkmarks, not badges or alerts
- Empty states: sketch illustrations, never flat icons

**Tone of voice**: discreet, warm, editorial, human. Never clinical or transactional.

Copy examples: "Meet through people who know your vibe." / "Not just a profile. A person, in context." / "Through friends, not algorithms."

Avoid: "Connect with matches", "Swipe right", "Find your soulmate today", anything that sounds like a dating app or payment product.

---

## Art Direction

Core style: watercolor warmth + pencil-sketch intimacy + private-club restraint + low-saturation editorial tone.

**Use**: pencil sketch illustrations, watercolor blooms, warm ivory paper texture, graphite linework, subtle botanicals, old-world city sketches, dinner/cafe scenes, profile dossier collages, private map imagery.

**Avoid**: hyperreal photos, futuristic AI visuals, hearts and romance clichés, swiping cards, pink dating app graphics, glossy 3D renders.

**Illustration motifs**: friends at dinner, cafe introductions, handwritten notes, private intro briefs, pencil portraits, old city maps, bridges, shield/lock symbols, botanical pencil sketches, wax seal marks, editorial quote cards.

**Watercolor**: fog blue, stone gray, warm amber, dust lavender, muted teal. Atmospheric, not decorative noise. Avoid bright rainbow or saturated gradients.

---

## Existing Assets (`packages/assets/`)

| File | Description | Use for |
|---|---|---|
| `friend-gather-hero.png` | Friends at candlelit dinner, watercolor + network lines | Hero section, social posts |
| `landing-page-image.png` | Pencil sketch: wine glasses, candle, hands on book | Secondary hero, intimate section |
| `image.png` | Illustrated city map with glowing warm nodes | Network / cities section |
| `region-01.png` | Torn paper note: "Through friends, not algorithms." | Quote card, editorial accent |
| `region-02.png` | Pencil portrait of woman in profile | Profile card, trusted referrer |
| `region-02 copy.png` | Same portrait with fog-blue watercolor wash | Profile card variant |
| `region-06.png` | Blank torn paper card with tape | Card background, note surface |
| `region-07.png` | Pencil botanical branch sketch | Decorative accent, section divider |
| `screen-mock-1.png` | 4-screen flow: voice onboarding → bounty → profile → verify | App store, product demo |
| `screen-mock-2.png` | 5-screen flow: membership → ghost mode → intro brief → referrers → concierge | App store, marketing |
| `card.png` | Dark referral bounty card UI with amber/purple watercolor splash | Feature preview, marketing |

**Assets still needed** — generate or commission (all pencil/watercolor style):

| Path | Description |
|---|---|
| `/textures/paper-grain.webp` | Fine paper grain for `.paper-texture` overlay (16% opacity, multiply blend) |
| `/washes/fog-blue-watercolor.webp` | Atmospheric fog-blue watercolor field |
| `/washes/warm-amber-watercolor.webp` | Warm amber glow wash |
| `/illustrations/cafe-intro.webp` | Two people introduced at a cafe |
| `/illustrations/private-bridge.webp` | Illustrated bridge / connection motif |
| `/illustrations/shield-lock.webp` | Pencil shield or lock for privacy section |
| `/illustrations/handwriting-review.webp` | Handwritten concierge note |
| `/icons/sohoist-monogram.svg` | S inside thin pencil circle, graphite |
| `/icons/verified-stamp.svg` | Quiet checkmark stamp |
| `/icons/private-brief.svg` | Dossier / envelope, thin stroke |

---

## Motion & Interaction

Motion should feel like paper, not software.

**Use**: cards lifting on hover (y: −6px, rotate: −0.4deg), soft parallax on watercolor layers, pencil lines drawing in on scroll, stamps fading in, slow watercolor bloom, gentle page transitions.

**Avoid**: confetti, bouncy animations, neon glows, fast carousels, swipe gestures.

```tsx
// card hover — spring lift
whileHover={{ y: -6, rotate: -0.4, scale: 1.01 }}
transition={{ type: "spring", stiffness: 180, damping: 22 }}

// section reveal — slow fade up
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.7, ease: "easeOut" }}
viewport={{ once: true, margin: "-80px" }}
```

Reduced motion handled in `globals.css` — always respect `prefers-reduced-motion`.

---

## Hero Direction

**Headline**: "Low-stakes dating, / matched by vibe / in real life."
**Body**: "A private introduction network where trusted people make thoughtful matches."
**Primary CTA**: "Join Waitlist →" · **Secondary**: "Learn more →"
**Visual**: `friend-gather-hero.png` — warm candlelit dinner, no overt romance, no hearts, no swiping UI.

---

## User Flows (Reference for Feature Work)

```
Onboarding
  └── Voice conversation → AI-built profile draft → User reviews/edits

Bounty Setup
  └── Choose amount ($100–$2000) → Choose deposit tier → Escrow deposit → Profile activates

Getting Introduced
  └── Wingman sees both people → Creates introduction with context → Both parties notified

Relationship Confirmation
  └── Both users confirm → Friends confirm → Relationship record created → 6-month timer starts

Payout
  └── 6 months pass → Both parties still confirmed → Escrow releases bounty
```

---

## What This App Is Not

Do not build toward these patterns — they are antithetical to the product:

- Swipe or card-deck browsing
- Algorithmic "suggested matches" or "people you may know" feeds
- Likes, super-likes, boosts, or any gamification mechanic
- Read receipts or "active X minutes ago" presence signals
- Any mechanic that creates anxiety or urgency

---

## Implementation Notes

Design tokens live in two canonical files — keep them in sync:
- **Web CSS**: `apps/web/src/app/globals.css` — CSS custom properties, `@theme` block, component classes (`.paper-card`, `.primary-button`, `.badge`, `.text-display`, `.pencil-divider`, etc.)
- **Native TS**: `apps/native/src/theme.ts` — TypeScript token object with colors, typography, radius, shadow, spacing, and pre-built `StyleSheet` fragments

Fonts loaded for web via `next/font/google` in `apps/web/src/app/layout.tsx`: `Cormorant_Garamond`, `Inter`, `IBM_Plex_Mono` exposed as CSS variables `--font-cormorant`, `--font-inter`, `--font-mono`.

Native: Inter variants are bundled in `apps/native/src/assets/fonts/`. Cormorant Garamond falls back to Georgia — add via `@expo-google-fonts/cormorant-garamond` when ready.

---

## Commands

```sh
# run all packages (backend, web, native) concurrently via Turbo
pnpm dev

# build everything
pnpm build

# typecheck all packages
pnpm typecheck

# lint web app only
pnpm --filter web-app lint

# format entire workspace
pnpm format

# run individual packages
pnpm --filter web-app dev          # Next.js on localhost:3000
pnpm --filter native-app ios       # Expo on iOS simulator
pnpm --filter native-app android   # Expo on Android
pnpm --filter @packages/backend dev  # Convex dev server (required for any UI work)

# initial convex + clerk setup (first time only)
pnpm --filter @packages/backend setup
```

Requires Node `>=20.20.0` and `pnpm@10.33.0`.

---

## Architecture

This is a pnpm + Turborepo monorepo with three packages:

### `packages/backend` — Convex backend (shared by both apps)

- `convex/schema.ts` — single `notes` table: `{ userId, title, content, summary? }`, indexed `by_userId`
- `convex/notes.ts` — all CRUD queries and mutations; ownership is enforced server-side by matching `note.userId` to the Clerk subject
- `convex/openai.ts` — `internalAction` that calls OpenAI to generate a note summary, then patches the record via `internalMutation`; triggered via `ctx.scheduler.runAfter` when `isSummary: true` on create
- `convex/auth.config.ts` — Clerk JWT validation via `CLERK_JWT_ISSUER_DOMAIN` env var

The generated Convex types live in `convex/_generated/`. After any schema or function change, the `convex dev` process regenerates these automatically. Both apps import from `@packages/backend/convex/_generated/api` and `dataModel`.

### `apps/web` — Next.js 16 App Router

- Auth is enforced at the middleware level (`src/proxy.ts` via `clerkMiddleware`); all `/notes/*` routes are protected
- `ConvexClientProvider` wraps the tree with `ConvexProviderWithClerk`, bridging Clerk's `useAuth` to the Convex client
- Notes components (`src/components/notes/`) call Convex directly with `useQuery`/`useMutation` from `convex/react`
- Styling: Tailwind CSS v4, Radix UI primitives, `tailwind-merge` + `class-variance-authority` for variant composition
- Design tokens: `src/app/globals.css`, fonts loaded in `src/app/layout.tsx`

### `apps/native` — Expo SDK 55 (Expo Router)

- Route groups: `(app)/` for authenticated screens, `(auth)/` for sign-in; each layout redirects based on `useAuth().isSignedIn`
- `ConvexClientProvider` at the root wraps `ClerkProvider` (with `tokenCache`) and `ConvexProviderWithClerk`
- Screen logic lives in `src/screens/`; Expo Router files in `src/app/` are thin wrappers that render the screen component
- Fonts loaded at root layout: Inter variants registered as `Bold`, `SemiBold`, `Medium`, `Regular`
- Design tokens: `src/theme.ts`

---

## Environment Variables

**`packages/backend`** (Convex env, set via Convex dashboard):

- `CLERK_JWT_ISSUER_DOMAIN` — required; Convex throws on startup if missing
- `OPENAI_API_KEY` — optional; summaries silently fail with an error message if absent

**`apps/web/.env.local`**:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**`apps/native/.env.local`**:

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

---

## Key Patterns

- **Adding a backend function**: add to `convex/notes.ts` (or a new file), export as `query`/`mutation`/`action`, then call via `api.<file>.<name>` in any app after Convex regenerates types
- **Calling internal functions**: use `internal.<file>.<name>` (not `api`) and export with `internalAction`/`internalMutation`
- **Auth in backend functions**: use `getUserId` for optional auth, `requireUserId` when auth is mandatory — both are in `convex/notes.ts`
- **Deploying**: Convex deploys the backend and triggers the Next.js build together; see `apps/web/vercel.json` for the Vercel flow

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
