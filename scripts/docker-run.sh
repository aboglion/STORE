#!/usr/bin/env bash
# ============================================================
# make run — הפעלה דרך דוקר לפרודקשן (Docker Production Runner)
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER=".supabase-initialized"

echo "============================================================"
echo "🐳 הפעלת מערכת מסחר ב-Docker (סביבת פרודקשן)"
echo "============================================================"

# 1. בדיקת זמינות Docker
if ! command -v docker &> /dev/null; then
    echo "❌ שגיאה: Docker אינו מותקן במערכת."
    exit 1
fi

# 2. וידוא התקנת Supabase והפעלתו המקומית במידת הצורך
if [ ! -d node_modules ]; then
    echo "📦 מתקין תלויות פרויקט (בפעם הראשונה)..."
    npm install
fi

echo "🗄️  בודק שרת Supabase מקומי (Docker)..."
npx supabase start

if [ ! -f "${MARKER}" ]; then
    echo "⚙️  אתחול מסד נתונים והרצת מיגרציות ראשוניות..."
    npx supabase db reset
    touch "${MARKER}"
fi

# 3. יצירת/אימות .env.local
if [ ! -f .env.local ]; then
    echo "📝 מייצר קובץ .env.local..."
    bash scripts/env-local.sh
fi

# 4. יצירת משתמש אדמין (idempotent)
bash scripts/create-admin.sh

# 5. ניקוי תהליכים או קונטיינרים קודמים על פורט 3000
echo "🧹 מנקה קונטיינרים ישנים..."
docker compose down 2>/dev/null || true

# 6. בנייה והרצה של קונטיינר הפרודקשן
echo "🚀 בונה ומפעיל את קונטיינר הפרודקשן ב-Docker..."
docker compose up --build -d

echo ""
echo "============================================================"
echo "✅ המערכת רצה בהצלחה בפרודקשן דרך Docker!"
echo "   🛍️  חנות:            http://localhost:3000"
echo "   🔐 ניהול אדמין:     http://localhost:3000/admin/login"
echo "   📊 Supabase Studio: http://127.0.0.1:54323"
echo "============================================================"
echo "ℹ️  לצפייה בלוגים שוטפים: make docker-logs (או docker compose logs -f)"
echo "ℹ️  לעצירת המערכת:        make docker-stop (או docker compose down)"
echo "============================================================"
