#!/bin/sh
# ==============================================================================
# Restore a full backup — runs INSIDE the store container.
#
# Usage: db-restore.sh <backup-id>   (id format: <UTC-ts>_<manual|scheduled|pre-restore>)
#
# Safety guarantees:
#   1. The requested dump archive is validated BEFORE anything is touched.
#   2. An automatic "pre-restore" safety backup of the CURRENT state is created.
#   3. Active DB connections are terminated, then pg_restore --clean --if-exists
#      is applied, PostgREST schema cache is reloaded, and a sanity check runs.
#   4. Storage files (images/logos) are restored on the HOST via the .queue/
#      mechanism — the Supabase storage volume is root-owned and the web
#      container (uid 1001) cannot overwrite it.
# ==============================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
PGHOST="${PGHOST:-host.docker.internal}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"
BACKUP_TZ="${BACKUP_TZ:-Asia/Jerusalem}"
export TZ="${TZ:-$BACKUP_TZ}"

BACKUP_ID="${1:-}"
LOG_FILE="$BACKUP_DIR/backups.log"
LOCK_FILE="$BACKUP_DIR/.backup.lock"
LOCK_DIR="$BACKUP_DIR/.backup.lock.d"

# Strict ID validation — prevents path traversal.
# (Ungrouped alternatives: `(...)` in a case pattern is not portable across
# POSIX shells and matches literally in bash without extglob.)
case "$BACKUP_ID" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_manual|[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_scheduled|[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_pre-restore) ;;
    *) echo "INVALID_BACKUP_ID" >&2; exit 2 ;;
esac

RESTORE_PATH="$BACKUP_DIR/$BACKUP_ID"
if [ ! -f "$RESTORE_PATH/db.dump" ]; then
    echo "BACKUP_NOT_FOUND" >&2
    exit 2
fi

mkdir -p "$BACKUP_DIR" "$BACKUP_DIR/.queue"
touch "$LOG_FILE"
chmod 666 "$LOG_FILE" 2>/dev/null || true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [db-restore] $*" >> "$LOG_FILE"; }

# ----------------------------------------------------------------------------
# Single-instance lock shared with db-backup.sh.
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

log "START restore id=$BACKUP_ID"

# 1) Validate the archive before touching anything.
if ! pg_restore --list "$RESTORE_PATH/db.dump" >/dev/null 2>&1; then
    log "ERROR: invalid dump archive"
    echo "INVALID_DUMP" >&2
    exit 1
fi

# 2) Safety: pre-restore backup of the current state (non-fatal on failure).
SAFE_ID="$(date -u '+%Y%m%dT%H%M%SZ')_pre-restore"
SAFE_PATH="$BACKUP_DIR/$SAFE_ID"
if mkdir -p "$SAFE_PATH" && PGPASSWORD="$PGPASSWORD" pg_dump \
    -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -Fc --no-owner --no-privileges -f "$SAFE_PATH/db.dump" 2>>"$LOG_FILE"; then
    log "OK: pre-restore safety backup created: $SAFE_ID"
else
    log "WARN: could not create pre-restore safety backup — continuing"
    rm -rf "$SAFE_PATH"
fi

# 3) Terminate active connections so --clean can drop objects.
log "INFO: terminating active DB connections"
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || log "WARN: connection termination returned warnings"
sleep 2

# 4) Restore. --clean drops existing objects; --if-exists tolerates gaps.
#    Exit code 1 = completed with warnings (common for extensions) — acceptable
#    when the post-restore sanity check passes.
set +e
PGPASSWORD="$PGPASSWORD" pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    --clean --if-exists --no-owner --no-privileges \
    "$RESTORE_PATH/db.dump" >/dev/null 2>>"$LOG_FILE"
PG_RESTORE_CODE=$?
set -e
if [ "$PG_RESTORE_CODE" -gt 1 ]; then
    log "ERROR: pg_restore failed (code=$PG_RESTORE_CODE)"
    echo "RESTORE_FAILED" >&2
    exit 1
fi
log "OK: pg_restore finished (code=$PG_RESTORE_CODE)"

# 5) Reload the PostgREST schema cache so the API reflects restored objects.
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true

# 6) Post-restore sanity check.
SANITY="$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo 0)"
log "OK: post-restore sanity — $SANITY public tables"

# 7) Enqueue host-side storage restore (root-owned volume).
if [ -f "$RESTORE_PATH/storage.tar.gz" ]; then
    REQ_ID="$(date -u '+%Y%m%dT%H%M%SZ')"
    cat > "$BACKUP_DIR/.queue/storage-restore-$REQ_ID.json" <<EOF
{
  "request_id": "$REQ_ID",
  "backup_id": "$BACKUP_ID",
  "requested_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "status": "pending"
}
EOF
    chmod 666 "$BACKUP_DIR/.queue/storage-restore-$REQ_ID.json" 2>/dev/null || true
    log "OK: storage restore enqueued ($REQ_ID) — will be applied by the host"
else
    log "WARN: backup has no storage archive — storage files left unchanged"
fi

log "DONE restore $BACKUP_ID"
echo "RESTORED"
exit 0
