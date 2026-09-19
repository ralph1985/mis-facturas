#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$project_dir/var/backups/postgres"
mkdir -p "$backup_dir"
chmod 700 "$project_dir/var" "$project_dir/var/backups" "$backup_dir"

node_bin="${NODE_BIN:-node}"
database_url="${DATABASE_URL:-}"
if [[ -z "$database_url" && -f "$project_dir/.env.local" ]]; then
  database_url="$(
    "$node_bin" -e '
      const dotenv = require(process.argv[1]);
      dotenv.config({ path: process.argv[2], quiet: true });
      process.stdout.write(process.env.DATABASE_URL || "");
    ' "$project_dir/node_modules/dotenv" "$project_dir/.env.local"
  )"
fi

if [[ -z "$database_url" ]]; then
  printf '%s\n' 'DATABASE_URL is not configured.' >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  printf '%s\n' 'pg_dump is required to create a PostgreSQL backup.' >&2
  exit 1
fi

pgpass_file="$(mktemp "$backup_dir/.pgpass.XXXXXX")"
temporary_file="$(mktemp "$backup_dir/.backup.XXXXXX")"
cleanup() {
  rm -f "$pgpass_file" "$temporary_file"
}
trap cleanup EXIT
chmod 600 "$pgpass_file" "$temporary_file"

# Keep credentials out of pg_dump arguments. The URL stays in an environment
# variable and the short-lived pgpass file is removed on every exit path.
DATABASE_URL="$database_url" "$node_bin" -e '
  const url = new URL(process.env.DATABASE_URL);
  const decode = (value) => decodeURIComponent(value);
  const escape = (value) => value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");
  const database = url.pathname.replace(/^\//, "");
  process.stdout.write(`${escape(url.hostname)}:${url.port || "5432"}:${escape(database)}:${escape(decode(url.username))}:${escape(decode(url.password))}\n`);
' >"$pgpass_file"

safe_database_url="$(
  DATABASE_URL="$database_url" "$node_bin" -e '
    const url = new URL(process.env.DATABASE_URL);
    url.password = "";
    process.stdout.write(url.toString());
  '
)"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$backup_dir/mis-facturas-$stamp.dump"
PGPASSFILE="$pgpass_file" pg_dump \
  --no-password \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$temporary_file" \
  --dbname="$safe_database_url"
mv "$temporary_file" "$backup_path"
chmod 600 "$backup_path"
printf 'PostgreSQL backup created: %s\n' "${backup_path##*/}"
