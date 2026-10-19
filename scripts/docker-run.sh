#!/usr/bin/env bash
# ============================================================
# make run — הפעלה מלאה דרך דוקר + הפעלת שירות רקע אוטונומי ועמידות באתחול
# ============================================================
set -euo pipefail

export TZ="${TZ:-Asia/Jerusalem}"

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

# 1b. בדיקת זמינות Node.js ו-npm (ואם חסר — התקנה אוטומטית על Ubuntu/Debian)
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Node.js או npm אינם מותקנים במערכת. מתקין Node.js (גרסה 20+)...${NC}"
    SUDO=""
    if [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
    if [ -n "$SUDO" ] || [ "$EUID" -eq 0 ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
        $SUDO apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js הותקן בהצלחה: $(node --version) | npm: $(npm --version)${NC}"
    else
        echo -e "${RED}❌ Node.js ו-npm חסרים ונדרשות הרשאות מנהל (root/sudo) להתקנה.${NC}" >&2
        exit 1
    fi
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

# 3b. הכנת תיקיית הגיבויים הייעודית (מחוץ לדוקר) והרשאות משותפות
BACKUP_DIR="${BACKUP_DIR:-/home/uns/store-backups}"
echo -e "${BLUE}💾 מכין תיקיית גיבויים ייעודית: ${BACKUP_DIR}...${NC}"
mkdir -p "$BACKUP_DIR"
if [ "$(id -u)" = "0" ]; then
    chown 1001:1001 "$BACKUP_DIR" 2>/dev/null || true
    chmod 775 "$BACKUP_DIR"
else
    chmod 777 "$BACKUP_DIR"
fi
mkdir -p "$BACKUP_DIR/.scheduler" "$BACKUP_DIR/.queue"
chmod 777 "$BACKUP_DIR/.scheduler" "$BACKUP_DIR/.queue" 2>/dev/null || true

# 4. יצירת/אימות .env.local ו-.env
if [ ! -f .env.local ] || [ ! -f .env ]; then
    echo -e "${BLUE}📝 מייצר קובץ .env.local ו-.env...${NC}"
    bash scripts/env-local.sh
fi

# 5. יצירת משתמש אדמין (idempotent)
bash scripts/create-admin.sh

# 6. עצירת קונטיינר קודם אם היה קיים כדי לוודא הפעלה נקייה
echo -e "${BLUE}🧹 מנקה קונטיינרים ישנים של האפליקציה...${NC}"
docker compose down 2>/dev/null || true

# 7. בנייה והרצה של קונטיינר הפרודקשן
# טוען את .env.local לסביבת ה-shell כך ש-docker compose יוכל להעביר
# את משתני ה-NEXT_PUBLIC_* כ-build args ל-Dockerfile (מוטמעים בזמן build).
echo -e "${BLUE}🚀 בונה ומפעיל את קונטיינר הפרודקשן ב-Docker...${NC}"
set -a
# shellcheck disable=SC1091
source .env.local
set +a
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
echo -e "${CYAN}   💾 גיבויים:          ${BACKUP_DIR} (אוטומטי 03:00 ו-16:00, שמירת 30 אחרונים)${NC}"
echo -e "${CYAN}   ⚡ אתחול שרת (Boot): השירות יעלה מחדש באופן אוטומטי מלא${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "ℹ️  לצפייה בלוגים של האפליקציה:   make docker-logs"
echo -e "ℹ️  לצפייה בלוגים של שירות הרקע:  make updater-logs"
echo -e "ℹ️  לצפייה בסטטוס המערכת והשירות: make status"
echo -e "ℹ️  לעצירת כל המערכת והשירות:     make stop"
echo -e "${GREEN}${BOLD}============================================================${NC}"
