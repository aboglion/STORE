#!/usr/bin/env bash
# ============================================================
# make run — הפעלה מלאה דרך דוקר + הפעלת שירות רקע אוטונומי ועמידות באתחול
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER=".supabase-initialized"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "🐳 הפעלת מערכת מסחר ב-Docker (סביבת פרודקשן + שירות רקע)"
echo "============================================================"
echo -e "${NC}"

# 1. בדיקת זמינות Docker (ואם חסר — התקנה אוטומטית על Ubuntu)
if ! command -v docker >/dev/null 2>&1 || (! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1); then
    echo -e "${YELLOW}⚠️  Docker או Docker Compose אינם מותקנים. מפעיל התקנה אוטומטית...${NC}"
    chmod +x "$ROOT_DIR/scripts/install-docker.sh"
    "$ROOT_DIR/scripts/install-docker.sh"
fi

# 2. וידוא התקנת תלויות Node ופרויקט
if [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 מתקין תלויות פרויקט (בפעם הראשונה)...${NC}"
    npm install
fi

# 3. וידוא והפעלת Supabase
echo -e "${BLUE}🗄️  בודק שרת Supabase מקומי (Docker)...${NC}"
npx supabase start

if [ ! -f "${MARKER}" ]; then
    echo -e "${BLUE}⚙️  אתחול מסד נתונים והרצת מיגרציות ראשוניות...${NC}"
    npx supabase db reset
    touch "${MARKER}"
fi

# 4. יצירת/אימות .env.local
if [ ! -f .env.local ]; then
    echo -e "${BLUE}📝 מייצר קובץ .env.local...${NC}"
    bash scripts/env-local.sh
fi

# 5. יצירת משתמש אדמין (idempotent)
bash scripts/create-admin.sh

# 6. עצירת קונטיינר קודם אם היה קיים כדי לוודא הפעלה נקייה
echo -e "${BLUE}🧹 מנקה קונטיינרים ישנים של האפליקציה...${NC}"
docker compose down 2>/dev/null || true

# 7. בנייה והרצה של קונטיינר הפרודקשן
echo -e "${BLUE}🚀 בונה ומפעיל את קונטיינר הפרודקשן ב-Docker...${NC}"
docker compose up --build -d

# 8. הפעלת שירות הרקע וה-Supervisor (כולל עמידות באתחול שרת / Reboot)
echo -e "${BLUE}🛡️  מגדיר ומפעיל שירות רקע אוטונומי (Auto-Updater & Boot Supervisor)...${NC}"
chmod +x "$ROOT_DIR/scripts/service.sh" "$ROOT_DIR/scripts/auto-updater.sh"
bash "$ROOT_DIR/scripts/service.sh" start

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}✅ המערכת והשירות עלו בהצלחה מלאה!${NC}"
echo -e "${GREEN}   🛍️  חנות:             http://localhost:3000${NC}"
echo -e "${GREEN}   🔐 ניהול אדמין:      http://localhost:3000/admin/login${NC}"
echo -e "${GREEN}   📊 Supabase Studio:  http://127.0.0.1:54323${NC}"
echo -e "${CYAN}   🔄 שירות רקע:        פעיל (בודק עדכוני GitHub כל 60 שניות)${NC}"
echo -e "${CYAN}   ⚡ אתחול שרת (Boot): השירות יעלה מחדש באופן אוטומטי מלא${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "ℹ️  לצפייה בלוגים של האפליקציה:   make docker-logs"
echo -e "ℹ️  לצפייה בלוגים של שירות הרקע:  make updater-logs"
echo -e "ℹ️  לצפייה בסטטוס המערכת והשירות: make status"
echo -e "ℹ️  לעצירת כל המערכת והשירות:     make stop"
echo -e "${GREEN}${BOLD}============================================================${NC}"
