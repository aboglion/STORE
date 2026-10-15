#!/usr/bin/env bash
# ==============================================================================
# התקנת Docker ו-Docker Compose על Ubuntu / Debian באופן אוטומטי ועמיד
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🐳 בדיקה והתקנת סביבת Docker${NC}"
echo -e "${BLUE}============================================================${NC}"

# בדיקה האם Docker ו-Docker Compose כבר מותקנים ותקינים
has_docker=0
has_compose=0

if command -v docker >/dev/null 2>&1; then
    has_docker=1
fi

if docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
    has_compose=1
fi

if [ "$has_docker" -eq 1 ] && [ "$has_compose" -eq 1 ]; then
    echo -e "${GREEN}✅ Docker כבר מותקן במערכת: $(docker --version 2>/dev/null || echo '')${NC}"
    echo -e "${GREEN}✅ Docker Compose כבר מותקן: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo '')${NC}"
    
    # בדיקת הרשאות להרצת דוקר ללא sudo
    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✅ הרשאות Docker תקינות עבור המשתמש הנוכחי ($(whoami)).${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Docker מותקן אך למשתמש הנוכחי אין גישה ישירה ל-Docker socket.${NC}"
        echo -e "${YELLOW}   מוסיף את המשתמש לקבוצת docker...${NC}"
        if [ "$EUID" -ne 0 ]; then
            sudo usermod -aG docker "$(whoami)" 2>/dev/null || true
        else
            usermod -aG docker "${SUDO_USER:-$(whoami)}" 2>/dev/null || true
        fi
        exit 0
    fi
fi

echo -e "${YELLOW}⚙️  Docker חסר או חלקי במערכת. מתחיל בתהליך התקנה אוטומטי...${NC}"

# וידוא הרשאות sudo/root
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        echo -e "${RED}❌ נדרשות הרשאות מנהל (root או sudo) לצורך התקנת Docker על המערכת.${NC}" >&2
        exit 1
    fi
fi

# בדיקת סוג הפצה (רק Debian/Ubuntu נתמכות להתקנה אוטומטית זו)
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ לא זוהה קובץ /etc/os-release. ההתקנה האוטומטית נתמכת ב-Ubuntu/Debian בלבד.${NC}" >&2
    exit 1
fi

. /etc/os-release
OS_ID="${ID:-ubuntu}"
OS_LIKE="${ID_LIKE:-debian}"

if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" && "$OS_LIKE" != *"debian"* && "$OS_LIKE" != *"ubuntu"* ]]; then
    echo -e "${RED}❌ מערכת הפעלה אינה Ubuntu/Debian ($OS_ID). אנא התקן Docker ידנית.${NC}" >&2
    exit 1
fi

echo -e "${BLUE}📦 מעדכן מאגרי חבילות ומתקין תלויות בסיסיות...${NC}"
$SUDO apt-get update -y
$SUDO apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# הגדרת מאגר Docker הרשמי
echo -e "${BLUE}🔑 מגדיר מפתח GPG ומאגר רשמי של Docker...${NC}"
$SUDO install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO tee /etc/apt/keyrings/docker.asc > /dev/null
    $SUDO chmod a+r /etc/apt/keyrings/docker.asc
fi

CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
if [ -z "$CODENAME" ] && [ -n "${VERSION_ID:-}" ]; then
    CODENAME="$(lsb_release -cs 2>/dev/null || echo "jammy")"
fi

REPO_DISTRO="ubuntu"
if [ "$OS_ID" = "debian" ]; then
    REPO_DISTRO="debian"
fi

ARCH="$(dpkg --print-architecture 2>/dev/null || echo "amd64")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${REPO_DISTRO} ${CODENAME} stable" | \
    $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null

echo -e "${BLUE}📦 מתקין את Docker Engine ו-Docker Compose...${NC}"
INSTALL_SUCCESS=0
if $SUDO apt-get update -y && $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
    INSTALL_SUCCESS=1
else
    echo -e "${YELLOW}⚠️  התקנה מהמאגר הרשמי לא הצליחה (גרסה מוקדמת או בעיית רשת). עובר להתקנת חבילות הפצה (docker.io)...${NC}"
    if $SUDO apt-get install -y docker.io docker-compose-v2 || $SUDO apt-get install -y docker.io; then
        INSTALL_SUCCESS=1
    fi
fi

if [ "$INSTALL_SUCCESS" -ne 1 ]; then
    echo -e "${RED}❌ התקנת Docker נכשלה. נא לבדוק את חיבור האינטרנט או להריץ התקנה ידנית.${NC}" >&2
    exit 1
fi

# הפעלת והרשמת שירות Docker
echo -e "${BLUE}🚀 מפעיל ומגדיר את שירות Docker לעלייה אוטומטית באתחול שרת...${NC}"
$SUDO systemctl enable docker || true
$SUDO systemctl start docker || true

# הוספת המשתמש הנוכחי לקבוצת docker
TARGET_USER="${SUDO_USER:-$(whoami)}"
if [ "$TARGET_USER" != "root" ]; then
    echo -e "${BLUE}👤 מוסיף את המשתמש ${TARGET_USER} לקבוצת docker...${NC}"
    $SUDO usermod -aG docker "$TARGET_USER" || true
fi

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ התקנת Docker הושלמה בהצלחה!${NC}"
echo -e "${GREEN}   Docker Version:  $(docker --version 2>/dev/null || echo 'מותקן')${NC}"
echo -e "${GREEN}   Compose Version: $(docker compose version 2>/dev/null || echo 'מותקן')${NC}"
echo -e "${GREEN}============================================================${NC}"
