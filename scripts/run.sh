#!/usr/bin/env bash
#
# make run — one-shot launcher for the whole project.
#
# First run:   install deps → start Supabase (Docker) → reset DB (migrations +
#              seed) → generate .env.local → create admin → start dev server.
# Later runs:  start Supabase → .env.local → admin → start dev server
#              (the DB is NOT wiped again — use `make db-reset` to reset).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER=".supabase-initialized"

# ------------------------------------------------------------
# 1. Dependencies
# ------------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies (first time) ..."
  npm install
else
  echo "✅ Dependencies already installed"
fi

# ------------------------------------------------------------
# 2. Start the local Supabase stack (idempotent)
# ------------------------------------------------------------
echo "🐳 Starting local Supabase (Docker) ..."
npx supabase start

# ------------------------------------------------------------
# 3. First run only: apply migrations + seed
# ------------------------------------------------------------
if [ ! -f "${MARKER}" ]; then
  echo "🗄️  First run — applying migrations + seed.sql ..."
  npx supabase db reset
  touch "${MARKER}"
  echo "✅ Database initialized (marker: ${MARKER})"
else
  echo "✅ Database already initialized (skip reset — use 'make db-reset' to reset)"
fi

# ------------------------------------------------------------
# 4. .env.local
# ------------------------------------------------------------
bash scripts/env-local.sh

# ------------------------------------------------------------
# 5. Admin user (idempotent)
# ------------------------------------------------------------
bash scripts/create-admin.sh

# ------------------------------------------------------------
# 6. Dev server
# ------------------------------------------------------------
echo "=============================================="
echo "🚀 Starting Next.js dev server ..."
echo "   Store:  http://localhost:3000"
echo "   Admin:  http://localhost:3000/admin/login"
echo "   Studio: http://127.0.0.1:54323"
echo "=============================================="
npm run dev