#!/usr/bin/env bash
# ==============================================================================
# Service Manager — ניהול שירות המערכת ב-systemd (הפעלה ברקע ובעליית השרת)
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE_NAME="store-commerce.service"
USER_SYSTEMD_DIR="${HOME}/.config/systemd/user"
SYSTEM_SYSTEMD_DIR="/etc/systemd/system"
PID_FILE="$ROOT_DIR/logs/updater.pid"
LOG_FILE="$ROOT_DIR/logs/updater.log"
SERVICE_LOG="$ROOT_DIR/logs/service.log"

mkdir -p "$ROOT_DIR/logs"

# בדיקה האם systemd זמין במערכת
has_systemd=0
if command -v systemctl >/dev/null 2>&1 && systemctl --version >/dev/null 2>&1; then
    has_systemd=1
fi

# קביעה האם להשתמש ב-systemd user או systemd root
is_root=0
if [ "$EUID" -eq 0 ]; then
    is_root=1
fi

install_service() {
    echo "⚙️  מגדיר את שירות $SERVICE_NAME ב-systemd..."
    
    local path_env
    path_env="$(echo "$PATH" | tr ':' '\n' | grep -v '^$' | paste -sd ':' -)"
    
    local service_content="[Unit]
Description=Store Commerce - Auto-Updater, Docker Supervisor & Reboot Recovery
After=network-online.target default.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT_DIR}
ExecStart=${ROOT_DIR}/scripts/auto-updater.sh run
Restart=always
RestartSec=5
TimeoutStopSec=15
KillMode=mixed
StandardOutput=append:${SERVICE_LOG}
StandardError=append:${SERVICE_LOG}
Environment=\"PATH=${path_env}\"
Environment=\"NODE_ENV=production\"

[Install]
WantedBy=default.target
"

    if [ "$is_root" -eq 1 ]; then
        echo "$service_content" > "$SYSTEM_SYSTEMD_DIR/$SERVICE_NAME"
        systemctl daemon-reload
        systemctl enable "$SERVICE_NAME" 2>/dev/null || true
        echo "✅ שירות המערכת הותקן בהצלחה ב-$SYSTEM_SYSTEMD_DIR/$SERVICE_NAME"
    else
        mkdir -p "$USER_SYSTEMD_DIR"
        echo "$service_content" > "$USER_SYSTEMD_DIR/$SERVICE_NAME"
        systemctl --user daemon-reload
        systemctl --user enable "$SERVICE_NAME" 2>/dev/null || true
        
        # וידוא linger עבור המשתמש הנוכחי (כך שהשירות יעלה ב-boot לפני כניסת משתמש)
        if command -v loginctl >/dev/null 2>&1; then
            loginctl enable-linger "$(whoami)" 2>/dev/null || true
        fi
        echo "✅ שירות המשתמש הותקן והופעל לעלייה ב-boot: $USER_SYSTEMD_DIR/$SERVICE_NAME"
    fi
}

start_service() {
    install_service
    
    if [ "$has_systemd" -eq 1 ]; then
        if [ "$is_root" -eq 1 ]; then
            systemctl start "$SERVICE_NAME"
            echo "🚀 שירות $SERVICE_NAME הופעל (Systemd System)."
        else
            systemctl --user restart "$SERVICE_NAME"
            echo "🚀 שירות $SERVICE_NAME הופעל ברקע (Systemd User)."
        fi
    else
        # Fallback לסביבות ללא systemd (למשל מכולות בדיקה)
        echo "⚠️  systemd אינו זמין, מפעיל תהליך רקע עצמאי (daemon)..."
        "$ROOT_DIR/scripts/auto-updater.sh" stop 2>/dev/null || true
        nohup "$ROOT_DIR/scripts/auto-updater.sh" run >> "$SERVICE_LOG" 2>&1 &
        echo "🚀 תהליך רקע הופעל עם PID: $!"
    fi
}

stop_service() {
    echo "🛑 עוצר את שירות הרקע וה-Supervisor..."
    if [ "$has_systemd" -eq 1 ]; then
        if [ "$is_root" -eq 1 ]; then
            systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        else
            systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
        fi
    fi
    
    # וידוא עצירת כל תהליך updater פעיל
    "$ROOT_DIR/scripts/auto-updater.sh" stop 2>/dev/null || true
    pkill -f "auto-updater.sh run" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "✅ שירות הרקע נעצר לחלוטין."
}

status_service() {
    echo "============================================================"
    echo "📊 סטטוס שירות הרקע והאוטומציה (Store Commerce Service)"
    echo "============================================================"
    
    if [ "$has_systemd" -eq 1 ]; then
        if [ "$is_root" -eq 1 ]; then
            systemctl status "$SERVICE_NAME" --no-pager 2>&1 || true
        else
            systemctl --user status "$SERVICE_NAME" --no-pager 2>&1 || true
        fi
    else
        "$ROOT_DIR/scripts/auto-updater.sh" status
    fi
    
    echo ""
    echo "🐳 סטטוס קונטיינרים של Docker:"
    docker compose ps 2>&1 || true
    
    echo ""
    echo "📜 5 שורות אחרונות מלוג השירות:"
    if [ -f "$LOG_FILE" ]; then
        tail -n 5 "$LOG_FILE"
    else
        echo "אין לוגים עדיין."
    fi
    echo "============================================================"
}

logs_service() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "קובץ הלוג עדיין לא נוצר: $LOG_FILE"
    fi
}

case "${1:-status}" in
    install)
        install_service
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 1
        start_service
        ;;
    status)
        status_service
        ;;
    logs)
        logs_service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|install}"
        exit 1
        ;;
esac
