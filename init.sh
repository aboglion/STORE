#!/usr/bin/env bash
# ==============================================================================
# INIT — סקריפט אתחול, התקנת תלויות מערכת (Make, Docker, Node) והרצה ראשונית
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# צבעים להדפסה
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "  🚀 מערכת מסחר — אתחול מערכת והתקנה אוטומטית (INIT)"
echo "============================================================"
echo -e "${NC}"

# 1. זיהוי הרשאות מנהל (sudo או root)
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
fi

# פונקציית עזר להרצת apt-get רק בעת הצורך
run_apt_install() {
    local packages=("$@")
    if [ -z "$SUDO" ] && [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ נדרשות הרשאות מנהל (sudo/root) כדי להתקין: ${packages[*]}${NC}" >&2
        return 1
    fi
    echo -e "${BLUE}📦 מתקין חבילות מערכת: ${packages[*]}...${NC}"
    $SUDO apt-get update -y
    $SUDO apt-get install -y --no-install-recommends "${packages[@]}"
}

# 2. בדיקה והתקנה של make
if ! command -v make >/dev/null 2>&1; then
    echo -e "${YELLOW}⚙️  Make אינו מותקן במערכת. מתקין Make...${NC}"
    run_apt_install make build-essential
    echo -e "${GREEN}✅ Make הותקן בהצלחה: $(make --version | head -n 1)${NC}"
else
    echo -e "${GREEN}✅ Make מותקן: $(make --version | head -n 1)${NC}"
fi

# 3. בדיקה והתקנה של כלים בסיסיים (curl, git)
MISSING_TOOLS=()
for tool in curl git; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+=("$tool")
    fi
done
if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚙️  מתקין כלים חסרים: ${MISSING_TOOLS[*]}...${NC}"
    run_apt_install "${MISSING_TOOLS[@]}"
fi

# 4. בדיקה והתקנה של Docker ו-Docker Compose (אם חסרים)
if ! command -v docker >/dev/null 2>&1 || (! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1); then
    echo -e "${YELLOW}⚙️  Docker / Docker Compose חסר. מפעיל סקריפט התקנה אוטומטי...${NC}"
    chmod +x "$ROOT_DIR/scripts/install-docker.sh"
    "$ROOT_DIR/scripts/install-docker.sh"
else
    echo -e "${GREEN}✅ Docker תקין: $(docker --version 2>/dev/null || echo 'מותקן')${NC}"
fi

# 5. בדיקת Node.js ו-npm
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo -e "${YELLOW}⚙️  Node.js / npm חסר. מתקין Node.js (גרסה 20+)...${NC}"
    if [ "$EUID" -eq 0 ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js הותקן בהצלחה: $(node --version)${NC}"
    elif [ -n "$SUDO" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js הותקן בהצלחה: $(node --version)${NC}"
    else
        echo -e "${RED}❌ Node.js אינו מותקן ולא נמצאו הרשאות להתקנה אוטומטית.${NC}" >&2
        exit 1
    fi
else
    echo -e "${GREEN}✅ Node.js מותקן: $(node --version) | npm: $(npm --version)${NC}"
fi

# 6. מתן הרשאות ריצה לכל הסקריפטים בפרויקט
echo -e "${BLUE}🔒 מוודא הרשאות ריצה לכל הסקריפטים...${NC}"
chmod +x "$ROOT_DIR"/scripts/*.sh 2>/dev/null || true
if [ -f "$ROOT_DIR/init" ]; then
    chmod +x "$ROOT_DIR/init" 2>/dev/null || true
fi
chmod +x "$ROOT_DIR/init.sh" 2>/dev/null || true

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ אתחול והתקנת תלויות המערכת הושלמו בהצלחה!${NC}"
echo -e "${GREEN}🚀 כעת מפעיל את הפרויקט באמצעות: make run${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""

# 7. הרצת make run
exec make run
