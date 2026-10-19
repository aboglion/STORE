#!/bin/sh
# ==============================================================================
# Full database backup — runs INSIDE the store container.
#
# Produces one timestamped folder in $BACKUP_DIR (bind-mounted from the host,
# i.e. OUTSIDE Docker) containing:
#   db.dump         — pg_dump -Fc (compressed custom format, ALL schemas
#                     including auth / storage / realtime / extensions)
#   storage.tar.gz  — Supabase Storage files (product images, logos)
#   meta.json       — type, timestamps, sizes, pg version
#
# After every run the retention policy is applied: only the newest N backups
# are kept (N read from config.json, default 30).
#
# Usage: db-backup.sh [manual|scheduled|pre-restore]
# ==============================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STORAGE_DIR="${BACKUP_STORAGE_DIR:-/supabase-storage}"
PGHOST="${PGHOST:-host.docker.internal}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"
BACKUP_TZ="${BACKUP_TZ:-Asia/Jerusalem}"
export TZ="${TZ:-$BACKUP_TZ}"

TYPE="${1:-manual}"
case "$TYPE" in manual|scheduled|pre-restore|uploaded) ;; *) TYPE="manual" ;; esac

LOG_FILE="$BACKUP_DIR/backups.log"
LOCK_FILE="$BACKUP_DIR/.backup.lock"
LOCK_DIR="$BACKUP_DIR/.backup.lock.d"

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"
chmod 666 "$LOG_FILE" 2>/dev/null || true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [db-backup] $*" >> "$LOG_FILE"; }

# ----------------------------------------------------------------------------
# Single-instance lock shared with db-restore.sh (both run in this container).
# flock is standard in Alpine's busybox; a mkdir-based fallback covers the
# unlikely case where it is unavailable.
# ----------------------------------------------------------------------------
has_flock=0
if command -v flock >/dev/null 2>&1; then has_flock=1; fi
acquire_lock() {
    if [ "$has_flock" -eq 1 ]; then
        exec 9>"$LOCK_FILE"
        if flock -n 9; then return 0; fi
        return 1
    fi
    tries=0
    while ! mkdir "$LOCK_DIR" 2>/dev/null; do
        tries=$((tries + 1))
        if [ -d "$LOCK_DIR" ] && [ -n "$(find "$LOCK_DIR" -mmin +30 2>/dev/null)" ]; then
            rmdir "$LOCK_DIR" 2>/dev/null || true
            continue
        fi
        [ "$tries" -gt 5 ] && return 1
        sleep 1
    done
    return 0
}
release_lock() {
    [ -d "$LOCK_DIR" ] && rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! acquire_lock; then
    log "ERROR: another backup/restore operation is already running"
    echo "LOCKED" >&2
    exit 3
fi
trap release_lock EXIT HUP INT TERM

TS="$(date -u '+%Y%m%dT%H%M%SZ')"
LABEL_TIME="$(TZ="$BACKUP_TZ" date '+%Y-%m-%d %H:%M %Z')"
BACKUP_PATH="$BACKUP_DIR/${TS}_${TYPE}"
mkdir -p "$BACKUP_PATH"

START_TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
log "START type=$TYPE path=${TS}_${TYPE}"

# 1) Database dump — full custom format (compressed, enables selective restore).
if ! PGPASSWORD="$PGPASSWORD" pg_dump \
    -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -Fc --no-owner --no-privileges -f "$BACKUP_PATH/db.dump" 2>>"$LOG_FILE"; then
    log "ERROR: pg_dump failed"
    rm -rf "$BACKUP_PATH"
    echo "BACKUP_FAILED" >&2
    exit 1
fi

# Validate the archive is a readable custom-format dump before keeping it.
if ! pg_restore --list "$BACKUP_PATH/db.dump" >/dev/null 2>&1; then
    log "ERROR: dump validation failed (not a valid custom archive)"
    rm -rf "$BACKUP_PATH"
    echo "BACKUP_FAILED" >&2
    exit 1
fi
log "OK: pg_dump completed and validated"

DB_SIZE="$(du -h "$BACKUP_PATH/db.dump" | awk '{print $1}')"

# 2) Storage files (product images, logos) — read-only mount of the volume.
STORAGE_SIZE=""
STORAGE_UNCHANGED=false
STORAGE_HASH=""

if [ -d "$STORAGE_DIR" ] && [ -n "$(ls -A "$STORAGE_DIR" 2>/dev/null)" ]; then
    # Calculate fast fingerprint: path, size, and mtime of all files
    STORAGE_HASH="$(find "$STORAGE_DIR" -type f -exec stat -c "%n %s %Y" {} + 2>/dev/null | sort | sha256sum | awk '{print $1}')"

    # Find the most recent backup folder with a valid storage.tar.gz
    PREV_STORAGE_DIR=""
    for d in $(ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{8}T[0-9]{6}Z_(manual|scheduled|pre-restore|uploaded)$' | sort -r || true); do
        if [ "$d" != "${TS}_${TYPE}" ] && [ -f "$BACKUP_DIR/$d/storage.tar.gz" ]; then
            PREV_STORAGE_DIR="$BACKUP_DIR/$d"
            break
        fi
    done

    # Check if images have not changed since that backup
    REUSE_STORAGE=0
    if [ -n "$PREV_STORAGE_DIR" ] && [ -n "$STORAGE_HASH" ]; then
        if [ -f "$PREV_STORAGE_DIR/storage.sha256" ]; then
            PREV_HASH="$(cat "$PREV_STORAGE_DIR/storage.sha256" 2>/dev/null || true)"
            if [ "$PREV_HASH" = "$STORAGE_HASH" ]; then
                REUSE_STORAGE=1
            fi
        else
            # Fallback for previous backups created before sha256 tracking:
            # check if any files in storage are newer than the previous archive
            NEWER_COUNT="$(find "$STORAGE_DIR" -type f -newer "$PREV_STORAGE_DIR/storage.tar.gz" 2>/dev/null | head -n 1 | wc -l)"
            if [ "$NEWER_COUNT" -eq 0 ]; then
                REUSE_STORAGE=1
            fi
        fi
    fi

    if [ "$REUSE_STORAGE" -eq 1 ]; then
        # Images did NOT change! Hard-link the archive (0 bytes duplicated, 0s compression time)
        if ln "$PREV_STORAGE_DIR/storage.tar.gz" "$BACKUP_PATH/storage.tar.gz" 2>/dev/null; then
            STORAGE_SIZE="$(du -h "$BACKUP_PATH/storage.tar.gz" | awk '{print $1}')"
            STORAGE_UNCHANGED=true
            echo "$STORAGE_HASH" > "$BACKUP_PATH/storage.sha256" 2>/dev/null || true
            log "OK: storage unchanged (${STORAGE_HASH:0:8}...) — reused archive from $(basename "$PREV_STORAGE_DIR") without re-compressing"
        fi
    fi

    # If not reused (new images / changed images / first run)
    if [ "$STORAGE_UNCHANGED" != "true" ]; then
        if tar czf "$BACKUP_PATH/storage.tar.gz" -C "$STORAGE_DIR" . 2>>"$LOG_FILE"; then
            STORAGE_SIZE="$(du -h "$BACKUP_PATH/storage.tar.gz" | awk '{print $1}')"
            [ -n "$STORAGE_HASH" ] && echo "$STORAGE_HASH" > "$BACKUP_PATH/storage.sha256" 2>/dev/null || true
            log "OK: storage archive created (${STORAGE_SIZE})"
        else
            log "WARN: storage tar failed — continuing with DB-only backup"
            rm -f "$BACKUP_PATH/storage.tar.gz"
        fi
    fi
else
    log "WARN: storage mount empty/absent — skipping storage archive"
fi

END_TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
TOTAL_SIZE="$(du -sh "$BACKUP_PATH" | awk '{print $1}')"
PG_VERSION="$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc 'SHOW server_version' 2>/dev/null || echo unknown)"

cat > "$BACKUP_PATH/meta.json" <<EOF
{
  "id": "${TS}_${TYPE}",
  "type": "$TYPE",
  "started_at": "$START_TS",
  "finished_at": "$END_TS",
  "label_time": "$LABEL_TIME",
  "db_size": "$DB_SIZE",
  "storage_size": "${STORAGE_SIZE:-}",
  "storage_unchanged": $STORAGE_UNCHANGED,
  "storage_hash": "$STORAGE_HASH",
  "total_size": "$TOTAL_SIZE",
  "pg_version": "$PG_VERSION"
}
EOF

# 3) Retention — keep only the newest N folders per config.json (default 30).
RETENTION=30
if [ -f "$BACKUP_DIR/config.json" ]; then
    RETENTION="$(node -e 'try{const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(c.retention??30))}catch{process.stdout.write("30")}' "$BACKUP_DIR/config.json" 2>/dev/null || echo 30)"
fi
case "$RETENTION" in
    *[!0-9]*|'') RETENTION=30 ;;
esac
[ "$RETENTION" -lt 1 ] 2>/dev/null && RETENTION=1 || true
[ "$RETENTION" -gt 90 ] 2>/dev/null && RETENTION=90 || true

COUNTER=0
for d in $(ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{8}T[0-9]{6}Z_(manual|scheduled|pre-restore|uploaded)$' | sort -r || true); do
    COUNTER=$((COUNTER + 1))
    if [ "$COUNTER" -gt "$RETENTION" ]; then
        rm -rf "$BACKUP_DIR/$d"
        log "RETENTION: removed $d (limit ${RETENTION})"
    fi
done

log "DONE: ${TS}_${TYPE} total=${TOTAL_SIZE} retention=${RETENTION}"
echo "${TS}_${TYPE}"
exit 0
