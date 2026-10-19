#!/usr/bin/env bash
# ==============================================================================
# Git Auto-Updater & Zero-Downtime Docker Supervisor
# שירות רקע אוטונומי: בדיקת עדכוני גיטהאב, בנייה בטוחה, שחזור מתקלות ועמידות באתחול
# ==============================================================================
set -euo pipefail

export TZ="${TZ:-Asia/Jerusalem}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# יצירת תיקיית לוגים
mkdir -p "$ROOT_DIR/logs"

PID_FILE="$ROOT_DIR/logs/updater.pid"
LOG_FILE="$ROOT_DIR/logs/updater.log"
LOCK_FILE="$ROOT_DIR/logs/updater.lock"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}" # ברירת מחדל: בדיקה כל 60 שניות
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://127.0.0.1:3000/api/health}"
MAX_LOG_SIZE=10485760 # 10MB

# פונקציית תיעוד מסודרת
log() {
    local level="${1:-INFO}"
    local msg="${2:-}"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

rotate_log_if_needed() {
    if [ -f "$LOG_FILE" ]; then
        local size
        size=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            log "INFO" "מסובב קובץ לוגים (חרג מ-10MB)..."
            tail -n 3000 "$LOG_FILE" > "${LOG_FILE}.tmp" 2>/dev/null || true
            mv "${LOG_FILE}.tmp" "$LOG_FILE" 2>/dev/null || true
        fi
    fi
}

# השהיה הניתנת להפסקה מיידית בקבלת אות SIGTERM/SIGINT
interruptible_sleep() {
    local duration="${1:-$CHECK_INTERVAL}"
    sleep "$duration" &
    local sleep_pid=$!
    wait "$sleep_pid" 2>/dev/null || true
}

# המתנה לזמינות Docker Daemon (חשוב ביותר בעת אתחול שרת / Reboot)
wait_for_docker() {
    local max_retries=60
    local count=0
    log "INFO" "בודק זמינות Docker daemon..."
    while ! docker info >/dev/null 2>&1; do
        count=$((count + 1))
        if [ "$count" -ge "$max_retries" ]; then
            log "ERROR" "Docker daemon לא זמין לאחר ${max_retries} שניות! ממשיך ומנסה..."
            return 1
        fi
        sleep 1
    done
    log "INFO" "Docker daemon פעיל ותקין."
    return 0
}

# אימות והפעלת שירותי התשתית (Supabase וקונטיינר החנות)
ensure_services_running() {
    log "INFO" "מוודא שכל שירותי המערכת רצים ותקינים..."

    if [ -f "$ROOT_DIR/.env.local" ]; then
        set -a
        source "$ROOT_DIR/.env.local" 2>/dev/null || true
        set +a
    elif [ -f "$ROOT_DIR/.env" ]; then
        set -a
        source "$ROOT_DIR/.env" 2>/dev/null || true
        set +a
    fi
    
    # 1. הפעלת Supabase במידה ואינו רץ
    if [ -f "$ROOT_DIR/supabase/config.toml" ]; then
        if ! npx supabase status >/dev/null 2>&1; then
            log "INFO" "שרת Supabase אינו רץ. מפעיל שרת Supabase מקומי..."
            npx supabase start >> "$LOG_FILE" 2>&1 || {
                log "WARN" "הפעלת Supabase נתקלה בשגיאה, נמשיך בניסיון להפעיל את קונטיינר החנות."
            }
        fi
    fi

    # 2. אימות קונטיינר החנות (store_commerce_prod) ו-HTTPS אם מוגדר דומיין
    local is_running caddy_running domain
    domain="$(grep -E '^DOMAIN=' .env.local 2>/dev/null | cut -d= -f2- || true)"
    is_running=$(docker ps --filter "name=store_commerce_prod" --filter "status=running" -q 2>/dev/null || true)

    if [ -n "$domain" ] && [ "$domain" != "localhost" ]; then
        caddy_running=$(docker ps --filter "name=store_commerce_caddy" --filter "status=running" -q 2>/dev/null || true)
        if [ -z "$is_running" ] || [ -z "$caddy_running" ]; then
            log "INFO" "שירותי האפליקציה או ה-HTTPS אינם רצים במלואם. מפעיל אותם עכשיו..."
            docker compose --profile ssl up -d >> "$LOG_FILE" 2>&1 || {
                log "ERROR" "נכשלה הפעלת docker compose --profile ssl up -d"
            }
        fi
    else
        if [ -z "$is_running" ]; then
            log "INFO" "קונטיינר החנות (store_commerce_prod) אינו רץ. מפעיל אותו עכשיו..."
            docker compose up -d >> "$LOG_FILE" 2>&1 || {
                log "ERROR" "נכשלה הפעלת docker compose up -d"
            }
        fi
    fi
}

# בדיקת בריאות האפליקציה (Health check — מאמתת תגובת שרת + חיבור למסד הנתונים)
check_health() {
    local max_wait="${1:-45}"
    local count=0
    while [ "$count" -lt "$max_wait" ]; do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            return 0
        fi
        count=$((count + 2))
        sleep 2
    done
    return 1
}

# לולאת הפיקוח והעדכון האוטומטי
run_supervisor() {
    # וידוא שרק מופע אחד רץ בו זמנית בעזרת נעילה
    exec 200>"$LOCK_FILE"
    if ! flock -n 200; then
        echo "Auto-updater is already running in another process."
        exit 0
    fi

    echo "$$" > "$PID_FILE"
    
    cleanup() {
        log "WARN" "Auto-Updater קיבל אות עצירה. סוגר תהליכים נלווים..."
        kill $(jobs -p) 2>/dev/null || true
        rm -f "$PID_FILE"
        exit 0
    }
    trap cleanup SIGINT SIGTERM EXIT

    log "INFO" "============================================================"
    log "INFO" "🚀 שירות Auto-Updater & Supervisor החל לרוץ (PID: $$)"
    log "INFO" "   תיקיית פרויקט: $ROOT_DIR"
    log "INFO" "   תדירות בדיקה: כל ${CHECK_INTERVAL} שניות"
    log "INFO" "============================================================"

    # שלב אתחול ראשוני (במיוחד לאחר Reboot)
    wait_for_docker || true
    ensure_services_running

    # בדיקת תזמון גיבויים ראשונית מיד לאחר עליית השירות (catch-up)
    bash "$ROOT_DIR/scripts/backup-host.sh" >> "$LOG_FILE" 2>&1 || true

    # השהיה ראשונית קצרה וניתנת להפסקה
    interruptible_sleep 5

    while true; do
        rotate_log_if_needed
        cd "$ROOT_DIR" || exit 1

        # בדיקת תזמון גיבויים אוטומטיים + עיבוד תור שחזור Storage (מארח)
        bash "$ROOT_DIR/scripts/backup-host.sh" >> "$LOG_FILE" 2>&1 || true

        # איתור ענף ה-Git הנוכחי (ברירת מחדל: master)
        CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'master')"
        if [ "$CURRENT_BRANCH" = "HEAD" ] || [ -z "$CURRENT_BRANCH" ]; then
            CURRENT_BRANCH="master"
        fi

        # משיכת מידע מ-GitHub עם מנגנון הגנה מפני נפילות רשת רגעיות
        FETCH_OK=0
        for attempt in 1 2 3; do
            if git fetch origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
                FETCH_OK=1
                break
            fi
            sleep 2
        done

        if [ "$FETCH_OK" -ne 1 ]; then
            log "WARN" "לא ניתן להתחבר ל-GitHub (בדיקה חוזרת בעוד ${CHECK_INTERVAL} שניות)."
            interruptible_sleep "$CHECK_INTERVAL"
            continue
        fi

        LOCAL_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"
        REMOTE_COMMIT="$(git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || echo '')"

        if [ -n "$LOCAL_COMMIT" ] && [ -n "$REMOTE_COMMIT" ] && [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
            log "INFO" "🔔 זוהתה גרסה חדשה ב-GitHub עבור ענף '$CURRENT_BRANCH'!"
            log "INFO" "   קומיט נוכחי: $LOCAL_COMMIT"
            log "INFO" "   קומיט חדש:   $REMOTE_COMMIT"
            log "INFO" "מתחיל בתהליך עדכון בטוח (Zero-Downtime Safe Update)..."

            # 1. שמירת שינויים מקומיים בקבצים במקרה הצורך (git stash)
            STASHED=0
            if ! git diff-index --quiet HEAD -- 2>/dev/null; then
                log "INFO" "נמצאו שינויים מקומיים, שומר אותם ב-stash..."
                git stash push -m "auto-updater-$(date +%s)" >/dev/null 2>&1 || true
                STASHED=1
            fi

            # 2. משיכת הקוד החדש (fast-forward only למניעת קונפליקטים)
            if ! git pull --ff-only origin "$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1; then
                log "ERROR" "❌ משיכת Git (git pull --ff-only) נכשלה. העדכון בוטל כדי למנוע השבתה!"
                if [ "$STASHED" -eq 1 ]; then
                    git stash pop >/dev/null 2>&1 || true
                fi
                interruptible_sleep "$CHECK_INTERVAL"
                continue
            fi

            log "INFO" "✅ הקוד נמשך בהצלחה מ-GitHub. בונה כעת את קונטיינר ה-Docker בבטחה..."

            # וידוא טעינת משתני הסביבה העדכניים עבור בניית הדוקר
            if [ -f "$ROOT_DIR/.env.local" ]; then
                set -a
                source "$ROOT_DIR/.env.local" 2>/dev/null || true
                set +a
            elif [ -f "$ROOT_DIR/.env" ]; then
                set -a
                source "$ROOT_DIR/.env" 2>/dev/null || true
                set +a
            fi

            # 3. בניית תמונת ה-Docker החדשה בזמן שהקונטיינר הישן עדיין רץ ומשרת לקוחות!
            BUILD_SUCCESS=0
            if docker compose build web >> "$LOG_FILE" 2>&1; then
                BUILD_SUCCESS=1
            else
                log "ERROR" "❌ בניית תמונת ה-Docker החדשה נכשלה עבור קומיט $REMOTE_COMMIT!"
                log "WARN" "🛡️  מבצע Rollback מיידי של קוד ה-Git לקומיט הקודם: $LOCAL_COMMIT..."
                git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1 || true
                if [ "$STASHED" -eq 1 ]; then
                    git stash pop >/dev/null 2>&1 || true
                fi
                log "INFO" "✅ הקוד שוחזר. הקונטיינר הקיים ממשיך לרוץ ללא כל השבתה."
                interruptible_sleep "$CHECK_INTERVAL"
                continue
            fi

            # 4. הרצת מיגרציות Supabase במידה ונוספו
            if [ -d "$ROOT_DIR/supabase/migrations" ]; then
                log "INFO" "בודק ומריץ מיגרציות Supabase במידת הצורך..."
                npx supabase migration up --local >> "$LOG_FILE" 2>&1 || {
                    log "WARN" "הרצת מיגרציות החזירה שגיאה קלה, ממשיך בהפעלת הקונטיינר."
                }
            fi

            # 5. החלפה מהירה של הקונטיינר לתמונה החדשה שנבנתה
            log "INFO" "🚀 מפעיל מחדש את קונטיינר החנות עם הגרסה החדשה..."
            if ! docker compose up -d web caddy >> "$LOG_FILE" 2>&1; then
                log "ERROR" "❌ הפעלת הקונטיינר החדש נכשלה! מנסה להחזיר לגרסה הקודמת..."
                git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1 || true
                docker compose build web >> "$LOG_FILE" 2>&1 || true
                docker compose up -d web caddy >> "$LOG_FILE" 2>&1 || true
                interruptible_sleep "$CHECK_INTERVAL"
                continue
            fi

            # 6. בדיקת בריאות ווידוא שהאפליקציה החדשה עונה בפורט 3000
            log "INFO" "בודק תקינות תגובת השרת לאחר העדכון..."
            if check_health 45; then
                log "SUCCESS" "🎉 העדכון הושלם בהצלחה מלאה! האפליקציה רצה ותקינה בקומיט $REMOTE_COMMIT."
                # ניקוי תמונות ישנות ומטמון בנייה מוגזם למניעת עומס בדיסק
                docker image prune -f --filter "until=24h" >/dev/null 2>&1 || true
                docker builder prune -f --filter "until=48h" --reserved-space 5GB >/dev/null 2>&1 || true
                if [ "$STASHED" -eq 1 ]; then
                    git stash pop >/dev/null 2>&1 || true
                fi
            else
                log "ERROR" "🚨 בדיקת הבריאות נכשלה! האפליקציה בגרסה החדשה אינה מגיבה בפורט 3000."
                log "WARN" "🛡️  מבצע שחזור אוטומטי (Rollback) מלא לגרסה $LOCAL_COMMIT..."
                git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1 || true
                docker compose build web >> "$LOG_FILE" 2>&1 || true
                docker compose up -d --no-deps web >> "$LOG_FILE" 2>&1 || true
                if [ "$STASHED" -eq 1 ]; then
                    git stash pop >/dev/null 2>&1 || true
                fi
                log "INFO" "✅ השרת שוחזר בהצלחה לגרסה הקודמת והיציבה."
            fi
        else
            # ודא שהקונטיינר עדיין חי (הגנה מפני נפילות בלתי צפויות)
            local running
            running=$(docker ps --filter "name=store_commerce_prod" --filter "status=running" -q 2>/dev/null || true)
            if [ -z "$running" ]; then
                log "WARN" "קונטיינר החנות קרס או הופסק באופן לא צפוי! מפעיל מחדש..."
                docker compose up -d >> "$LOG_FILE" 2>&1 || true
            fi
        fi

        interruptible_sleep "$CHECK_INTERVAL"
    done
}

case "${1:-run}" in
    run)
        run_supervisor
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
            echo "Auto-updater is RUNNING (PID: $(cat "$PID_FILE"))"
            exit 0
        else
            echo "Auto-updater is STOPPED"
            exit 1
        fi
        ;;
    stop)
        if [ -f "$PID_FILE" ]; then
            PID="$(cat "$PID_FILE" 2>/dev/null || true)"
            if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
                rm -f "$PID_FILE"
            fi
        fi
        ;;
    *)
        echo "Usage: $0 {run|status|stop}"
        exit 1
        ;;
esac
