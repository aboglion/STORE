#!/usr/bin/env bash
#
# מערכת מסחר — סקריפט התקנה והרצה בפקודה אחת
#
# שימוש:
#   ./scripts/setup.sh          # התקנה + בדיקות + בנייה
#   ./scripts/setup.sh dev      # התקנה + בדיקות + בנייה + הרצת שרת הפיתוח
#
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=============================================="
echo "  מערכת מסחר — סקריפט התקנה והרצה"
echo "=============================================="

# ------------------------------------------------------------
# 1. בדיקת דרישות מוקדמות
# ------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "${RED}❌ Node.js לא מותקן — התקן Node 20+ מ https://nodejs.org${NC}"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "${RED}❌ npm לא מותקן${NC}"
  exit 1
fi

echo "✅ Node: $(node --version)"
echo "✅ npm:  $(npm --version)"

# ------------------------------------------------------------
# 2. התקנת חבילות
# ------------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "${YELLOW}📦 מתקין חבילות (פעם ראשונה)...${NC}"
  npm install
else
  echo "✅ חבילות כבר מותקנות"
fi

# ------------------------------------------------------------
# 3. יצירת .env.local אם חסר
# ------------------------------------------------------------
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "${YELLOW}⚠️  נוצר .env.local — נא למלא את ערכי Supabase (URL, anon key, service role key)${NC}"
else
  echo "✅ .env.local קיים"
fi

# ------------------------------------------------------------
# 4. בדיקת משתני סביבה
# ------------------------------------------------------------
if grep -qE "NEXT_PUBLIC_SUPABASE_URL=$|NEXT_PUBLIC_SUPABASE_ANON_KEY=$|SUPABASE_SERVICE_ROLE_KEY=$" .env.local; then
  echo "${YELLOW}⚠️  חלק ממשתני Supabase ריקים — מלא אותם ב-.env.local לפני הרצה${NC}"
fi

# ------------------------------------------------------------
# 5. בדיקות + lint + typecheck + build
# ------------------------------------------------------------
echo "${YELLOW}🧪 מריץ בדיקות יחידה (Vitest)...${NC}"
npm test

echo "${YELLOW}🔍 מריץ lint...${NC}"
npm run lint

echo "${YELLOW}🔍 מריץ typecheck...${NC}"
npm run typecheck

echo "${YELLOW}🏗️  מריץ build...${NC}"
npm run build

# ------------------------------------------------------------
# 6. מיגרציות Supabase (אופציונלי — אם CLI מוגדר)
# ------------------------------------------------------------
SUPABASE_CMD=""
if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD="supabase"
elif npx --no-install supabase --version >/dev/null 2>&1; then
  SUPABASE_CMD="npx supabase"
fi

if [ -n "${SUPABASE_CMD}" ] && [ -f supabase/config.toml ]; then
  if ${SUPABASE_CMD} status >/dev/null 2>&1; then
    echo "${YELLOW}🗄️  מריץ מיגרציות מקומיות ב-Supabase...${NC}"
    ${SUPABASE_CMD} migration up --local || true
    bash scripts/create-admin.sh >/dev/null 2>&1 || true
  else
    STATUS_JSON="$(${SUPABASE_CMD} status -o json 2>/dev/null || true)"
    if echo "${STATUS_JSON}" | grep -q '"linked_project":[^n]'; then
      echo "${YELLOW}🗄️  מריץ מיגרציות ל-Supabase בענן...${NC}"
      ${SUPABASE_CMD} db push || true
    else
      echo "${YELLOW}ℹ️  Supabase המקומי לא רץ והפרויקט אינו מקושר לענן.${NC}"
      echo "   להפעלת Supabase מקומית (Docker): make db-start או make run"
      echo "   או הרץ את המיגרציות ידנית ב-SQL Editor של Supabase."
    fi
  fi
else
  echo "${YELLOW}ℹ️  Supabase CLI לא מוגדר — הרץ ידנית ב-SQL Editor של Supabase:${NC}"
  echo "   supabase/migrations/0001_schema.sql"
  echo "   supabase/migrations/0002_functions.sql"
  echo "   supabase/migrations/0003_views.sql"
  echo "   supabase/migrations/0004_rls.sql"
  echo "   supabase/seed.sql (אופציונלי — נתוני דמו)"
  echo "   ואז צור משתמש מנהל והוסף ל-admin_profiles (הוראות ב-README.md)"
fi

# ------------------------------------------------------------
# 7. הרצה
# ------------------------------------------------------------
echo "=============================================="
echo "${GREEN}✅ הכל הוכן בהצלחה!${NC}"
echo "   חנות:      http://localhost:3000"
echo "   דאשבורד:   http://localhost:3000/admin/login"
echo "=============================================="

if [ "${1:-}" = "dev" ] || [ "${1:-}" = "--dev" ]; then
  echo "${YELLOW}🚀 מריץ שרת הפיתוח...${NC}"
  npm run dev
else
  echo "להרצה: npm run dev"
fi