#!/usr/bin/env bash
#
# Creates or updates the admin user:
#   1. Checks if an admin already exists in the PostgreSQL database.
#   2. On server restart/boot (no custom params), preserves existing credentials.
#   3. If custom params provided (ADMIN_PASSWORD or ADMIN_EMAIL), updates or creates the admin.
#   4. If brand new DB (no admins), bootstraps default admin@example.com / admin1234.
#
# Idempotent — safe to run multiple times and during system boot.
#
# Defaults:  admin@example.com / admin1234 (used ONLY on empty database)
# Override:  ADMIN_PASSWORD=... bash scripts/create-admin.sh
#            ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/create-admin.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# טעינת משתני סביבה מ-.env.local או .env במידה וקיימים
if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local" 2>/dev/null || true
  set +a
elif [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env" 2>/dev/null || true
  set +a
fi

HAS_CUSTOM_EMAIL=0
if [ -n "${ADMIN_EMAIL+x}" ]; then
  HAS_CUSTOM_EMAIL=1
fi

HAS_CUSTOM_PASSWORD=0
if [ -n "${ADMIN_PASSWORD+x}" ]; then
  HAS_CUSTOM_PASSWORD=1
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin1234}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost}"
if [ "$SITE_URL" = "http://localhost:3000" ] || [ "$SITE_URL" = "http://127.0.0.1:3000" ]; then
  SITE_URL="http://localhost"
fi

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
# 1. Check existing admin profiles in PostgreSQL
# ------------------------------------------------------------
PROFILES_JSON="$(curl -sS -X GET "${REST_URL}/admin_profiles?select=id,email&limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" 2>/dev/null || true)"

EXISTING_ID="$(printf '%s' "${PROFILES_JSON}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
EXISTING_EMAIL="$(printf '%s' "${PROFILES_JSON}" | sed -n 's/.*"email":"\([^"]*\)".*/\1/p' | head -1)"

# Case A: Normal boot/restart with no parameters, and an admin already exists
if [ "${HAS_CUSTOM_EMAIL}" -eq 0 ] && [ "${HAS_CUSTOM_PASSWORD}" -eq 0 ] && [ -n "${EXISTING_ID}" ]; then
  echo "ℹ️  Admin profile already exists in PostgreSQL database: ${EXISTING_EMAIL}"
  echo "   Preserving existing credentials across restarts (skipping default creation)."
  echo "   To change password/email, use the dashboard (/admin/settings) or run:"
  echo "     ADMIN_PASSWORD=your_new_password make admin"
  exit 0
fi

# Case B: Admin exists, and user passed ADMIN_PASSWORD without custom email
if [ "${HAS_CUSTOM_EMAIL}" -eq 0 ] && [ "${HAS_CUSTOM_PASSWORD}" -eq 1 ] && [ -n "${EXISTING_ID}" ]; then
  echo "🔑 Updating password for existing admin: ${EXISTING_EMAIL} ..."
  UPDATE_RES="$(curl -sS -X PUT "${AUTH_URL}/admin/users/${EXISTING_ID}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"${ADMIN_PASSWORD}\"}")"

  if echo "${UPDATE_RES}" | grep -q '"id":'; then
    echo "✅ Password updated successfully in database for: ${EXISTING_EMAIL}"
    exit 0
  else
    echo "❌ Failed to update password. Response: ${UPDATE_RES}" >&2
    exit 1
  fi
fi

# Case C: Create or update specific ADMIN_EMAIL
echo "👤 Finding or creating auth user: ${ADMIN_EMAIL} ..."
USER_ID="$(curl -sS -X GET "${AUTH_URL}/admin/users?email=${ADMIN_EMAIL}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"

if [ -n "${USER_ID}" ]; then
  echo "ℹ️  Auth user exists (ID: ${USER_ID}). Updating password..."
  curl -sS -X PUT "${AUTH_URL}/admin/users/${USER_ID}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"${ADMIN_PASSWORD}\"}" >/dev/null
else
  echo "Creating auth user ${ADMIN_EMAIL} ..."
  CREATE_RESPONSE="$(curl -sS -X POST "${AUTH_URL}/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"email_confirm\":true}")"

  USER_ID="$(printf '%s' "${CREATE_RESPONSE}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
fi

if [ -z "${USER_ID}" ]; then
  echo "❌ Failed to create/find the auth user." >&2
  exit 1
fi

echo "🔑 Ensuring user is in admin_profiles table in PostgreSQL..."
curl -sS -X POST "${REST_URL}/admin_profiles" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -H "Prefer: return=minimal" \
  -d "{\"id\":\"${USER_ID}\",\"email\":\"${ADMIN_EMAIL}\",\"role\":\"admin\"}" >/dev/null

echo "✅ Admin ready in database: ${ADMIN_EMAIL}"
echo "   Login at ${SITE_URL}/admin/login"

if [ "${ADMIN_EMAIL}" = "admin@example.com" ] && [ "${ADMIN_PASSWORD}" = "admin1234" ]; then
  echo ""
  echo "⚠️  שים לב (סביבת ייצור / Production):"
  echo "   המערכת אותחלה עם פרטי ברירת מחדל זמניים (admin@example.com / admin1234)."
  echo "   חובה לשנות את הסיסמה והאימייל בהקדם דרך מסך ההגדרות בדשבורד:"
  echo "     ${SITE_URL}/admin/settings"
  echo "   או באמצעות פקודת Make:"
  echo "     ADMIN_EMAIL=myemail@domain.com ADMIN_PASSWORD=StrongPassword123! make admin"
fi