#!/usr/bin/env bash
# ==============================================================================
# Backup host coordinator — runs on the HOST (called by auto-updater.sh every
# supervisor cycle, and available as `make backup-host`).
#
#  A. Scheduled backups:
#     Reads $BACKUP_DIR/config.json ({enabled, times: ["HH:MM", ...], retention})
#     and triggers the SAME in-container script via `docker exec` when a
#     configured Asia/Jerusalem wall-clock time is due. Per-day marker files
#     guarantee one run per time slot per day, with same-day catch-up: if the
#     service was briefly down at the scheduled minute, the backup still runs
#     later that day.
#
#  B. Storage-restore queue:
#     Applies queued storage restores (written by db-restore.sh) as root —
#     the Supabase storage volume is root-owned and the web container (uid
#     1001) cannot overwrite it. Uses a one-shot `docker run` with the volume.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/uns/store-backups}"
CONTAINER="${STORE_CONTAINER:-store_commerce_prod}"
STORAGE_VOLUME="${STORAGE_VOLUME:-supabase_storage_omar}"
BACKUP_TZ="${BACKUP_TZ:-Asia/Jerusalem}"
SCHEDULER_LOG="$BACKUP_DIR/.scheduler/scheduler.log"

mkdir -p "$BACKUP_DIR/.scheduler" "$BACKUP_DIR/.queue"
# The dir is shared between the host process and the container (uid 1001);
# each side only writes its own files (host: markers/scheduler.log, container:
# backup folders/config/queue/log), so 777 on the two shared dirs is required.
chmod 777 "$BACKUP_DIR" "$BACKUP_DIR/.scheduler" "$BACKUP_DIR/.queue" 2>/dev/null || true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [backup-host] $*" >> "$SCHEDULER_LOG"; }

docker_available() { docker info >/dev/null 2>&1; }
container_running() { [ -n "$(docker ps -q --filter "name=$CONTAINER" --filter status=running 2>/dev/null)" ]; }

# ----------------------------------------------------------------------------
# A. Scheduled backups
# ----------------------------------------------------------------------------
run_scheduled_backups() {
    [ -f "$BACKUP_DIR/config.json" ] || return 0

    local payload
    payload="$(node -e '
        const fs = require("fs");
        let c = {};
        try { c = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
        if (c.enabled === false) { console.log("DISABLED"); process.exit(0); }
        const tz = process.argv[2] || "Asia/Jerusalem";
        const times = Array.isArray(c.times)
            ? c.times.filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
            : [];
        const now = new Date();
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
        }).formatToParts(now);
        const get = (type) => parts.find(p => p.type === type)?.value || "";
        const hh = String(parseInt(get("hour"), 10)).padStart(2, "0");
        console.log("NOW|" + get("year") + get("month") + get("day") + "|" + hh + ":" + get("minute"));
        for (const t of times) console.log("TIME|" + t);
    ' "$BACKUP_DIR/config.json" "$BACKUP_TZ" 2>/dev/null || echo DISABLED)"

    [ "$payload" != "DISABLED" ] || return 0

    local now_date now_hhmm t marker
    now_date="$(printf '%s\n' "$payload" | sed -n 's/^NOW|\([0-9]*\)|.*/\1/p')"
    now_hhmm="$(printf '%s\n' "$payload" | sed -n 's/^NOW|[0-9]*|\(.*\)/\1/p')"
    [ -n "$now_date" ] && [ -n "$now_hhmm" ] || return 0

    while IFS= read -r t; do
        [ -n "$t" ] || continue
        # Due when the Jerusalem wall-clock has reached the scheduled time
        # (marker prevents double-runs; catch-up covers downtime).
        if [ "$now_hhmm" = "$t" ] || [ "$now_hhmm" \> "$t" ]; then
            marker="$BACKUP_DIR/.scheduler/${now_date}_${t//:/}.marker"
            if [ ! -f "$marker" ]; then
                if docker_available && container_running; then
                    log "SCHEDULE due: $t (now $now_hhmm) — running scheduled backup"
                    if docker exec "$CONTAINER" sh /app/scripts/db-backup.sh scheduled >/dev/null 2>>"$BACKUP_DIR/backups.log"; then
                        touch "$marker"
                        log "OK scheduled backup completed, marker created"
                    else
                        log "ERROR scheduled backup failed — retry next cycle"
                    fi
                else
                    log "WARN scheduled backup due ($t) but container not running — retry next cycle"
                fi
            fi
        fi
    done < <(printf '%s\n' "$payload" | sed -n 's/^TIME|//p')
}

# ----------------------------------------------------------------------------
# B. Storage-restore queue (applied as root on the host)
# ----------------------------------------------------------------------------
process_storage_queue() {
    shopt -s nullglob 2>/dev/null || true
    local req rid backup_id tar_path
    for req in "$BACKUP_DIR"/.queue/storage-restore-*.json; do
        [ -f "$req" ] || continue
        rid="$(basename "$req" .json | sed 's/^storage-restore-//')"
        backup_id="$(node -e 'try{const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(o.backup_id||""))}catch{}' "$req" 2>/dev/null || true)"

        # Defense in depth: re-validate the backup id.
        # (Ungrouped alternatives: `(...)` in a case pattern matches literally
        # in bash without extglob, so it would reject every real backup id.)
        case "$backup_id" in
            [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_manual|[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_scheduled|[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_pre-restore|[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z_uploaded) ;;
            *)
                log "ERROR storage-restore request $rid has invalid backup_id"
                mv "$req" "$BACKUP_DIR/.queue/storage-restore-$rid.failed"
                continue
                ;;
        esac

        tar_path="$BACKUP_DIR/$backup_id/storage.tar.gz"
        if [ ! -f "$tar_path" ]; then
            log "ERROR storage archive missing for $backup_id"
            mv "$req" "$BACKUP_DIR/.queue/storage-restore-$rid.failed"
            continue
        fi

        if ! docker_available; then
            log "WARN docker unavailable for storage restore — retry next cycle"
            return 0
        fi

        log "QUEUE applying storage restore $rid (backup $backup_id)"
        if docker run --rm \
            -v "$STORAGE_VOLUME":/data \
            -v "$BACKUP_DIR":/backups:ro \
            alpine sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar xzf "/backups/'$backup_id'/storage.tar.gz" -C /data'; then
            log "OK storage restored for backup $backup_id"
            mv "$req" "$BACKUP_DIR/.queue/storage-restore-$rid.done"
        else
            log "ERROR storage restore command failed for $backup_id — retry next cycle"
        fi
    done
}

run_scheduled_backups
process_storage_queue
