#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
schedule="${MIS_FACTURAS_BACKUP_CRON_SCHEDULE:-30 1 * * *}"
lock_file="${MIS_FACTURAS_BACKUP_LOCK_FILE:-/tmp/mis-facturas-postgres-backup.lock}"
log_dir="${MIS_FACTURAS_LOG_DIR:-$project_dir/var/log}"
crontab_bin="${CRONTAB_BIN:-crontab}"
node_bin="${NODE_BIN:-$(command -v node || true)}"
pg_dump_bin="${PG_DUMP_BIN:-$(command -v pg_dump || true)}"

if [[ -n "$node_bin" && "$node_bin" != */* ]]; then
  node_bin="$(command -v "$node_bin" || true)"
fi
if [[ -n "$pg_dump_bin" && "$pg_dump_bin" != */* ]]; then
  pg_dump_bin="$(command -v "$pg_dump_bin" || true)"
fi

if [[ -z "$node_bin" || ! -x "$node_bin" ]]; then
  printf '%s\n' 'node es obligatorio para instalar el cron.' >&2
  exit 1
fi
if [[ -z "$pg_dump_bin" || ! -x "$pg_dump_bin" ]]; then
  printf '%s\n' 'pg_dump es obligatorio para instalar el cron.' >&2
  exit 1
fi
if [[ "$schedule" == *$'\n'* || "$schedule" == *$'\r'* ]]; then
  printf '%s\n' 'El horario del cron no puede contener saltos de línea.' >&2
  exit 1
fi

mkdir -p "$log_dir"
chmod 700 "$log_dir"

existing_crontab="$("$crontab_bin" -l 2>/dev/null || true)"
clean_crontab="$(
  printf '%s\n' "$existing_crontab" | awk '
    /^# BEGIN MIS-FACTURAS BACKUP$/ { skipping = 1; next }
    /^# END MIS-FACTURAS BACKUP$/ { skipping = 0; next }
    !skipping { print }
  '
)"

cron_log="$log_dir/postgres-backup.cron.log"
block=$(cat <<EOF
# BEGIN MIS-FACTURAS BACKUP
CRON_TZ=Europe/Madrid
$schedule /usr/bin/env NODE_BIN=$node_bin PG_DUMP_BIN=$pg_dump_bin /usr/bin/flock -n $lock_file $project_dir/scripts/backup-postgres.sh >> $cron_log 2>&1
# END MIS-FACTURAS BACKUP
EOF
)

printf '%s\n%s\n' "$clean_crontab" "$block" | "$crontab_bin"
printf '%s\n' 'Instalado el bloque de backup PostgreSQL de Mis Facturas.'
