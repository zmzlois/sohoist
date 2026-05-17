#!/bin/sh
# copy vars from root .env into each app's .env.local
# runs automatically via `predev` — safe to skip in CI where env is injected directly

ROOT=".env"
[ -f "$ROOT" ] || { echo "no root .env — skipping sync"; exit 0; }

# read a single-line value by key name
get() { grep -E "^${1}=" "$ROOT" 2>/dev/null | head -1 | cut -d= -f2-; }

# apps/native/.env.local — expo vars, some renamed from root
mkdir -p apps/native
cat > apps/native/.env.local <<EOF
EXPO_PUBLIC_CONVEX_URL=$(get EXPO_PUBLIC_CONVEX_URL)
EXPO_PUBLIC_AUTH_BASE_URL=$(get EXPO_PUBLIC_AUTH_BASE_URL)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$(get EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)
EXPO_PUBLIC_SOHOIST_AUTH_PASSWORD=$(get SOHOIST_AUTH_PASSWORD)
EXPO_PUBLIC_ADMIN_EMAIL=$(get ADMIN_EMAIL)
EOF

# apps/web/.env.local — next.js + nextauth vars
mkdir -p apps/web
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_CONVEX_URL=$(get NEXT_PUBLIC_CONVEX_URL)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
AUTH_SECRET=$(get AUTH_SECRET)
SOHOIST_AUTH_PASSWORD=$(get SOHOIST_AUTH_PASSWORD)
ADMIN_EMAIL=$(get ADMIN_EMAIL)
EOF

echo "env synced → apps/native/.env.local + apps/web/.env.local"
