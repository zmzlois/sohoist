# TODOS

## Architecture Decisions (decide before building the relevant feature)

- [ ] **Escrow provider** — Stripe Connect Express recommended. Decide before building reward pool (Feature 10). Referrer KYC and payout flow depend on this. See: design doc 2026-05-16.
- [ ] **Voice AI provider** — ElevenLabs Conversational AI (all-in-one) vs. Whisper + GPT-4 + custom orchestration. Decide before Feature 3. Affects real-time streaming architecture and screen states (listening → thinking → draft).
- [ ] **Object storage** — Convex File Storage (built-in, no CDN) vs. Cloudflare R2 (CDN, transformations). Decide before Feature 5 (photo upload). Convex is simpler; R2 is better if sketch images need CDN delivery.
- [ ] **6-month timer reliability** — Convex scheduled functions can fail silently on deployment changes. For a financial payout trigger, need either idempotent retry logic or an external scheduler (Trigger.dev, Inngest). Decide before Feature 16 (payout).
- [ ] **Candidate onboarding** — Plan doesn't specify: do candidates need an account to accept/decline an intro? What do they see before signing up? Needs UX decision and data model before Feature 13.

## Product Decisions

- [ ] **Reward ceiling** — plan caps at $2,000. Founding cohort evidence suggests $5,000–$10,000 range. Consider raising or making uncapped for concierge tier.
- [ ] **Founding members** — identify 5 founders in the existing network to be beta users. This is the highest-leverage action before any code ships. Do this now.
- [ ] **ICP specificity** — nail the founder/exec cohort first before opening to broader audiences. Don't add city-based communities until the core cohort is working.

## Deferred (explicitly out of scope for MVP)

- Circles / multi-tenant
- Full concierge workflow
- Complex disputes / automated payout decisions
- Native app (web-first for MVP)
- In-app chat (use intro room contact exchange instead)
- Real-money betting / gambling mechanics (not in product)
