## Installing a new web dependency in the sandbox

**What didn't work:** `pnpm view next-auth`, `pnpm add next-auth@5.0.0-beta.29 --offline`, and `pnpm add next-auth@5.0.0-beta.29 --lockfile-only` could not complete. The default pnpm store is outside the writable sandbox, offline metadata was incomplete, and online registry fetches failed with `ENOTFOUND registry.npmjs.org`.
**What worked:** Code changes were made directly, but the lockfile could not be regenerated in this environment.
**Note for next time:** When network is available, run `pnpm install` or `pnpm --filter web-app add next-auth@5.0.0-beta.29` outside the restricted sandbox to refresh `pnpm-lock.yaml`.

## Deploying from the sandbox

**What didn't work:** Vercel CLI account checks could not reach `api.vercel.com`, and npm/EAS commands cannot fetch packages from registry hosts in this sandbox.
**What worked:** Deployment config can be prepared locally, but the actual Vercel deploy and EAS TestFlight build must run from a networked shell.
**Note for next time:** Skip sandbox deploy attempts when DNS fails; run the prepared `vercel` and `eas` commands locally with Apple/Expo credentials.

## Starting the Next.js dev server in the sandbox

**What didn't work:** `pnpm --filter web-app dev -- --port 3000` passed the flag as a project directory, and direct Next dev server starts failed with `listen EPERM` on both `0.0.0.0:3000` and `127.0.0.1:3000`.
**What worked:** `pnpm --filter web-app build` completed successfully and should be used as the sandbox verification signal when local port binding is blocked.
**Note for next time:** Run `pnpm --filter web-app dev --port 3000` from a normal local shell if an interactive browser check is needed.
