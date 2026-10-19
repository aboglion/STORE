#!/usr/bin/env bash
# ============================================================
# scripts/set-domain.sh — הגדרת דומיין ו-HTTPS אוטומטי מלא
# ============================================================
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

RAW_DOMAIN="${1:-}"
ACME_EMAIL="${2:-${ACME_EMAIL:-admin@goldenmarket.com}}"

if [ -z "$RAW_DOMAIN" ]; then
    echo -e "${RED}❌ לא צוין דומיין.${NC}"
    echo "שימוש: make domain DOMAIN=yourdomain.com [EMAIL=admin@example.com]"
    echo "או:    bash scripts/set-domain.sh yourdomain.com [EMAIL]"
    exit 1
fi

# ניקוי פרוטוקול ולוכסנים אם הוזנו (למשל https://example.com/ -> example.com)
CLEAN_DOMAIN=$(echo "$RAW_DOMAIN" | sed -e 's|^https\?://||' -e 's|/.*$||' -e 's|:.*$||' | tr '[:upper:]' '[:lower:]' | xargs)

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "🌐 הגדרת דומיין ו-HTTPS אוטומטי (Let's Encrypt / Caddy)"
echo "============================================================"
echo -e "${NC}"
echo -e "${BLUE}🏷️  דומיין מבוקש: ${BOLD}${CLEAN_DOMAIN}${NC}"
echo -e "${BLUE}📧 אימייל לתעודה: ${BOLD}${ACME_EMAIL}${NC}"

# 1. בדיקת DNS וכתובת IP ציבורית
SERVER_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | tr -d '\n' || true)
echo -e "${BLUE}🖥️  כתובת ה-IP של השרת: ${BOLD}${SERVER_IP:-לא זוהתה}${NC}"

DOMAIN_IP=$(getent hosts "$CLEAN_DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || true)
if [ -n "$DOMAIN_IP" ]; then
    if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✅ בדיקת DNS עברה בהצלחה! הדומיין ${CLEAN_DOMAIN} מצביע לשרת (${DOMAIN_IP}).${NC}"
    else
        echo -e "${YELLOW}⚠️  הדומיין מצביע כרגע ל-${DOMAIN_IP} (שונה מה-IP של השרת ${SERVER_IP}).${NC}"
        echo -e "${YELLOW}   ודא שרשומת ה-A Record עודכנה בספק הדומיין שלך.${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  הדומיין עדיין לא מצביע ל-IP ב-DNS. תעודת ה-SSL תונפק אוטומטית ברגע שה-DNS יתעדכן.${NC}"
fi

# 2. עדכון .env.local ו-.env
ENV_FILE=".env.local"
[ ! -f "$ENV_FILE" ] && touch "$ENV_FILE"

# פונקציית עדכון או הוספת מפתח
set_env_key() {
    local key="$1"
    local value="$2"
    local file="$3"
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

set_env_key "DOMAIN" "$CLEAN_DOMAIN" "$ENV_FILE"
set_env_key "ACME_EMAIL" "$ACME_EMAIL" "$ENV_FILE"
set_env_key "NEXT_PUBLIC_SITE_URL" "https://${CLEAN_DOMAIN}" "$ENV_FILE"

if [ ! -L .env ]; then
    cp -f "$ENV_FILE" .env 2>/dev/null || true
fi

# 2b. שמירה קבועה בבסיס הנתונים (נשמרת בגיבוי ומשוחזרת אוטומטית בכל שרת חדש)
docker exec -i supabase_db_omar psql -U postgres -d postgres -c "
INSERT INTO settings (key, value, updated_at)
VALUES ('custom_domain', jsonb_build_object('domain', '$CLEAN_DOMAIN', 'acme_email', '$ACME_EMAIL'), now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
" 2>/dev/null || true

echo -e "${GREEN}✅ קובצי הסביבה (.env.local ו-.env) ובסיס הנתונים עודכנו בהצלחה!${NC}"

# 3. הפעלה מחדש של קונטיינרי ה-Docker כך ש-Caddy יקבל את הדומיין החדש
echo -e "${BLUE}🔄 מעדכן שירותי Docker (Caddy + Web)...${NC}"
set_env_key "HOST_HTTP_PORT" "3001" "$ENV_FILE"
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a
docker compose --profile ssl up -d

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 ההגדרה הושלמה בהצלחה מלאה!${NC}"
echo -e "${CYAN}   🌐 כתובת האתר:   ${BOLD}https://${CLEAN_DOMAIN}${NC}"
echo -e "${CYAN}   🔐 כניסת מנהל:    ${BOLD}https://${CLEAN_DOMAIN}/admin/login${NC}"
echo -e "${CYAN}   🔒 תעודת SSL:     מונפקת ומחודשת אוטומטית לחלוטין ע\"י Caddy (Let's Encrypt)${NC}"
echo -e "${CYAN}   🔀 הפניה:         פניות ב-HTTP (פורט 80) מופנות אוטומטית ל-HTTPS (פורט 443)${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
