#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${MIS_FACTURAS_BACKUP_DIR:-$project_dir/var/backups/postgres}"
log_dir="${MIS_FACTURAS_LOG_DIR:-$project_dir/var/log}"
retention_days="${MIS_FACTURAS_BACKUP_RETENTION_DAYS:-30}"
pg_dump_bin="${PG_DUMP_BIN:-$(command -v pg_dump || true)}"
node_bin="${NODE_BIN:-node}"
log_path="$log_dir/postgres-backup.log"

if [[ -n "$pg_dump_bin" && "$pg_dump_bin" != */* ]]; then
  pg_dump_bin="$(command -v "$pg_dump_bin" || true)"
fi

umask 077
mkdir -p "$backup_dir" "$log_dir"
chmod 700 "$backup_dir" "$log_dir"

log_message() {
  local line="[$(date --iso-8601=seconds)] $1"
  printf '%s\n' "$line" >>"$log_path"
  printf '%s\n' "$line"
}

fail_backup() {
  local message="$1"
  log_message "ERROR: $message" >&2
  exit 1
}

if [[ ! "$retention_days" =~ ^[0-9]+$ ]]; then
  fail_backup "MIS_FACTURAS_BACKUP_RETENTION_DAYS debe ser un entero no negativo."
fi

database_url="${DATABASE_URL:-}"
if [[ -z "$database_url" && -f "$project_dir/.env.local" ]]; then
  database_url="$(
    "$node_bin" -e '
      const dotenv = require(process.argv[1]);
      dotenv.config({ path: process.argv[2], quiet: true });
      process.stdout.write(process.env.DATABASE_URL || "");
    ' "$project_dir/node_modules/dotenv" "$project_dir/.env.local" 2>/dev/null || true
  )"
fi

if [[ -z "$database_url" ]]; then
  fail_backup "DATABASE_URL no está configurada."
fi

if [[ -z "$pg_dump_bin" || ! -x "$pg_dump_bin" ]]; then
  fail_backup "pg_dump es obligatorio para crear el backup."
fi

pgpass_file=""
temporary_file=""
cleanup() {
  rm -f "$pgpass_file" "$temporary_file"
}
trap cleanup EXIT

pgpass_file="$(mktemp "$backup_dir/.pgpass.XXXXXX")"
temporary_file="$(mktemp "$backup_dir/.backup.XXXXXX")"
chmod 600 "$pgpass_file" "$temporary_file"

# Keep credentials out of pg_dump arguments. The URL stays in an environment
# variable and the short-lived pgpass file is removed on every exit path.
if ! DATABASE_URL="$database_url" "$node_bin" -e '
  const url = new URL(process.env.DATABASE_URL);
  const decode = (value) => decodeURIComponent(value);
  const escape = (value) => value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");
  const database = url.pathname.replace(/^\//, "");
  process.stdout.write(`${escape(url.hostname)}:${url.port || "5432"}:${escape(database)}:${escape(decode(url.username))}:${escape(decode(url.password))}\n`);
' >"$pgpass_file" 2>/dev/null; then
  fail_backup "no se pudo preparar la autenticación PostgreSQL."
fi

safe_database_url=""
if ! safe_database_url="$(
  DATABASE_URL="$database_url" "$node_bin" -e '
    const url = new URL(process.env.DATABASE_URL);
    url.password = "";
    process.stdout.write(url.toString());
  ' 2>/dev/null
)"; then
  fail_backup "DATABASE_URL no es válida."
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$backup_dir/mis-facturas-$stamp.dump"
if ! PGPASSFILE="$pgpass_file" "$pg_dump_bin" \
  --no-password \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$temporary_file" \
  --dbname="$safe_database_url" \
  >/dev/null 2>/dev/null; then
  fail_backup "pg_dump no pudo crear el backup."
fi

if [[ ! -s "$temporary_file" ]]; then
  fail_backup "pg_dump creó un backup vacío."
fi

if ! mv "$temporary_file" "$backup_path"; then
  fail_backup "no se pudo publicar el backup."
fi
temporary_file=""
chmod 600 "$backup_path"

find "$backup_dir" -type f -name 'mis-facturas-*.dump' -mtime "+$retention_days" -delete

success_message="OK: backup SQL creado en $backup_path"
log_message "$success_message"
