#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
credentials="$project_dir/credenciales.txt"

if [ ! -f "$credentials" ]; then
  printf '%s\n' 'Falta credenciales.txt con DATABASE_URL.' >&2
  exit 1
fi

database_url=$(awk -F= '/^[[:space:]]*DATABASE_URL[[:space:]]*=/{sub(/^[^=]*=/,""); gsub(/^[[:space:]\042\047]+|[[:space:]\042\047]+$/,""); print; exit}' "$credentials" | tr -d '\r')
if [ -z "$database_url" ]; then
  printf '%s\n' 'DATABASE_URL no está configurada.' >&2
  exit 1
fi

cd "$project_dir"
DATABASE_URL="$database_url" \
DATABASE_SSL_REJECT_UNAUTHORIZED="${DATABASE_SSL_REJECT_UNAUTHORIZED:-false}" \
docker compose up -d --build
printf '%s\n' 'Aplicación disponible en http://localhost:8080'
