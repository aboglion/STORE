#!/usr/bin/env bash
# ==============================================================================
# התקנת כל תלויות המערכת: Docker, Compose, Node.js (20+), npm ותלויות פרויקט
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "📦 התקנת תלויות מערכת (Docker, Node.js, npm וספריות פרויקט)"
echo "============================================================"
echo -e "${NC}"

# זיהוי הרשאות מנהל (sudo / root)
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
fi

# 1. התקנת כלים בסיסיים (curl, git, make, ca-certificates)
MISSING_PKGS=()
for pkg in curl git make ca-certificates; do
    if ! command -v "$pkg" >/dev/null 2>&1; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo -e "${BLUE}📦 מתקין כלי בסיס חסרים: ${MISSING_PKGS[*]}...${NC}"
    if [ -n "$SUDO" ] || [ "$EUID" -eq 0 ]; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y --no-install-recommends "${MISSING_PKGS[@]}"
    else
        echo -e "${RED}❌ נדרשות הרשאות sudo/root להתקנת: ${MISSING_PKGS[*]}${NC}" >&2
    fi
fi

# 1b. וידוא זיכרון ו-Swap מספקים בשרת VPS
if command -v free >/dev/null 2>&1; then
    TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')
    TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
    if [ "$TOTAL_MEM" -lt 3500 ] && [ "$TOTAL_SWAP" -lt 1024 ]; then
        if [ "$EUID" -eq 0 ] || [ -n "$SUDO" ]; then
            SUDO_CMD=""
            [ "$EUID" -ne 0 ] && SUDO_CMD="$SUDO"
            if [ ! -f /swapfile ]; then
                echo -e "${BLUE}💾 זיכרון שרת נמוך (${TOTAL_MEM}MB RAM) — יוצר קובץ Swap של 2GB...${NC}"
                $SUDO_CMD fallocate -l 2G /swapfile 2>/dev/null || $SUDO_CMD dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true
                $SUDO_CMD chmod 600 /swapfile 2>/dev/null || true
                $SUDO_CMD mkswap /swapfile >/dev/null 2>&1 || true
                $SUDO_CMD swapon /swapfile >/dev/null 2>&1 || true
                if ! grep -q '/swapfile' /etc/fstab 2>/dev/null; then
                    echo '/swapfile none swap sw 0 0' | $SUDO_CMD tee -a /etc/fstab >/dev/null 2>&1 || true
                fi
                echo -e "${GREEN}✅ הוגדר Swap של 2GB בהצלחה!${NC}"
            fi
        fi
    fi
fi

# 2. בדיקה והתקנת Docker ו-Docker Compose
if ! command -v docker >/dev/null 2>&1 || (! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1); then
    echo -e "${YELLOW}⚙️  Docker / Docker Compose אינו מותקן. מתקין Docker...${NC}"
    chmod +x "$ROOT_DIR/scripts/install-docker.sh"
    "$ROOT_DIR/scripts/install-docker.sh"
else
    echo -e "${GREEN}✅ Docker כבר מותקן: $(docker --version 2>/dev/null || echo 'מותקן')${NC}"
    echo -e "${GREEN}✅ Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo 'מותקן')${NC}"
fi

# 3. בדיקה והתקנת Node.js ו-npm
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo -e "${YELLOW}⚙️  Node.js או npm חסרים. מתקין Node.js (גרסה 20+)...${NC}"
    if [ "$EUID" -eq 0 ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js הותקן בהצלחה: $(node --version) | npm: $(npm --version)${NC}"
    elif [ -n "$SUDO" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js הותקן בהצלחה: $(node --version) | npm: $(npm --version)${NC}"
    else
        echo -e "${RED}❌ Node.js ו-npm חסרים ונדרשות הרשאות מנהל (root/sudo) להתקנה.${NC}" >&2
        exit 1
    fi
else
    echo -e "${GREEN}✅ Node.js מותקן: $(node --version) | npm: $(npm --version)${NC}"
fi

# 4. הרשאות ריצה לכל הסקריפטים
chmod +x "$ROOT_DIR"/scripts/*.sh 2>/dev/null || true
if [ -f "$ROOT_DIR/init.sh" ]; then
    chmod +x "$ROOT_DIR/init.sh"
fi

# 5. התקנת תלויות הפרויקט (npm install)
echo -e "${BLUE}📦 מתקין תלויות פרויקט (npm install)...${NC}"
npm install

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}✅ כל התלויות (Docker, Node, npm, node_modules) הותקנו בהצלחה!${NC}"
echo -e "${GREEN}   Docker:  $(docker --version 2>/dev/null || echo 'מותקן')${NC}"
echo -e "${GREEN}   Node:    $(node --version 2>/dev/null || echo 'מותקן')${NC}"
echo -e "${GREEN}   npm:     $(npm --version 2>/dev/null || echo 'מותקן')${NC}"
echo -e "${GREEN}============================================================${NC}"
echo -e "${CYAN}🚀 להפעלת הפרויקט ב-Docker כעת, הרץ: make run${NC}"
