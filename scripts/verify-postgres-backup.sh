#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$project_dir/var/backups/postgres"
backup_path="${1:-}"

if [[ -z "$backup_path" ]]; then
  if [[ ! -d "$backup_dir" ]]; then
    printf '%s\n' 'No PostgreSQL backup directory exists.' >&2
    exit 1
  fi
  shopt -s nullglob
  candidates=("$backup_dir"/mis-facturas-*.dump)
  if ((${#candidates[@]} == 0)); then
    printf '%s\n' 'No PostgreSQL backup was found.' >&2
    exit 1
  fi
  backup_path="${candidates[0]}"
  for candidate in "${candidates[@]}"; do
    if [[ "$candidate" -nt "$backup_path" ]]; then
      backup_path="$candidate"
    fi
  done
fi

if [[ -z "$backup_path" || ! -f "$backup_path" ]]; then
  printf '%s\n' 'No PostgreSQL backup was found.' >&2
  exit 1
fi

if [[ ! -s "$backup_path" ]]; then
  printf '%s\n' 'The PostgreSQL backup is empty.' >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  printf '%s\n' 'pg_restore is required to verify a PostgreSQL backup.' >&2
  exit 1
fi

# Listing the archive validates its custom-format structure without connecting
# to a database or reading DATABASE_URL.
pg_restore --list "$backup_path" >/dev/null
printf 'PostgreSQL backup verified: %s\n' "$(basename "$backup_path")"
