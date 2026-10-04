#!/usr/bin/env bash
#
# Creates the first admin user for local development:
#   1. Creates an auth user via the GoTrue admin API (email + password).
#   2. Inserts the matching row into admin_profiles via PostgREST.
#
# Idempotent — safe to run multiple times.
#
# Defaults:  admin@example.com / admin1234
# Override:  ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/create-admin.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin1234}"

STATUS_ENV="$(npx supabase status -o env 2>/dev/null || true)"
API_URL="$(printf '%s\n' "${STATUS_ENV}" | sed -n 's/^API_URL="\(.*\)"/\1/p')"
SERVICE_ROLE_KEY="$(printf '%s\n' "${STATUS_ENV}" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"/\1/p')"

if [ -z "${API_URL}" ] || [ -z "${SERVICE_ROLE_KEY}" ]; then
  echo "❌ Supabase stack is not running. Start it first: make db-start" >&2
  exit 1
fi

AUTH_URL="${API_URL}/auth/v1"
REST_URL="${API_URL}/rest/v1"

# ------------------------------------------------------------
# 1. Create (or find) the auth user
# ------------------------------------------------------------
echo "👤 Creating auth user ${ADMIN_EMAIL} ..."
CREATE_RESPONSE="$(curl -sS -X POST "${AUTH_URL}/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"email_confirm\":true}")"

USER_ID="$(printf '%s' "${CREATE_RESPONSE}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"

if [ -z "${USER_ID}" ]; then
  # User probably already exists — look it up by email.
  echo "⚠️  User may already exist — looking it up ..."
  USER_ID="$(curl -sS -X GET "${AUTH_URL}/admin/users?email=${ADMIN_EMAIL}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
fi

if [ -z "${USER_ID}" ]; then
  echo "❌ Failed to create/find the auth user." >&2
  echo "   Response: ${CREATE_RESPONSE}" >&2
  exit 1
fi

echo "✅ Auth user id: ${USER_ID}"

# ------------------------------------------------------------
# 2. Add the user to admin_profiles (upsert, idempotent)
# ------------------------------------------------------------
echo "🔑 Adding to admin_profiles ..."
curl -sS -X POST "${REST_URL}/admin_profiles" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -H "Prefer: return=minimal" \
  -d "{\"id\":\"${USER_ID}\",\"email\":\"${ADMIN_EMAIL}\",\"role\":\"admin\"}" >/dev/null

echo "✅ Admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo "   Login at http://localhost:3000/admin/login"