#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.integration.yml"
COMPOSE_PROJECT_NAME="software-retail-integration"
INTEGRATION_DB_PORT="${INTEGRATION_DB_PORT:-55432}"
MIGRATION_TARGET="${1:-${INTEGRATION_MIGRATION_MAX:-latest}}"
KEEP_INTEGRATION_DB="${KEEP_INTEGRATION_DB:-0}"
INTEGRATION_LOCK_FILE="${INTEGRATION_LOCK_FILE:-/tmp/software-retail-integration.lock}"

exec 9>"${INTEGRATION_LOCK_FILE}"
if ! flock --nonblock 9; then
  echo "Ya existe una ejecución del arnés de integración; espera a que termine." >&2
  exit 4
fi

case "${MIGRATION_TARGET}" in
  pre)
    MIGRATION_MAX=11
    ;;
  post|latest|all)
    MIGRATION_MAX=999
    ;;
  [0-9]|[0-9][0-9]|[0-9][0-9][0-9])
    MIGRATION_MAX=$((10#${MIGRATION_TARGET}))
    ;;
  *)
    echo "Uso: $0 [pre|post|latest|NNN]" >&2
    exit 2
    ;;
esac

compose() {
  COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" \
  INTEGRATION_DB_PORT="${INTEGRATION_DB_PORT}" \
    docker compose -f "${COMPOSE_FILE}" "$@"
}

cleanup() {
  if [[ "${KEEP_INTEGRATION_DB}" != "1" ]]; then
    compose down --volumes >/dev/null 2>&1 || true
  else
    echo "Base de integración conservada por KEEP_INTEGRATION_DB=1."
  fi
}
trap cleanup EXIT

psql_file() {
  local sql_file="$1"
  compose exec -T postgres-integration \
    psql --username postgres --dbname retail_integration \
      --set ON_ERROR_STOP=on < "${sql_file}"
}

echo "Recreando PostgreSQL de integración aislado..."
compose down --volumes >/dev/null 2>&1 || true
compose up --detach --wait postgres-integration

psql_file "${ROOT_DIR}/database/integration/000_supabase_stubs.sql"
psql_file "${ROOT_DIR}/database/integration/001_legacy_domain.sql"

applied=0
while IFS= read -r migration; do
  filename="$(basename "${migration}")"
  migration_number="${filename%%_*}"
  migration_value=$((10#${migration_number}))
  if (( migration_value <= MIGRATION_MAX )); then
    echo "Aplicando ${filename}"
    psql_file "${migration}"
    applied=$((applied + 1))
  fi
done < <(find "${ROOT_DIR}/database/migrations" -maxdepth 1 -type f -name '[0-9][0-9][0-9]_*.sql' | sort)

if (( applied == 0 )); then
  echo "No se aplicó ninguna migración; revisa el objetivo ${MIGRATION_TARGET}." >&2
  exit 3
fi

psql_file "${ROOT_DIR}/database/integration/fixtures.sql"

compose exec -T postgres-integration \
  psql --username postgres --dbname retail_integration --set ON_ERROR_STOP=on \
  --command "select count(*) as usuarios_fixture from public.usuario;" \
  --command "select id, public, file_size_limit from storage.buckets order by id;"

export DATABASE_URL="postgresql://retail_api:retail_api_local_only@127.0.0.1:${INTEGRATION_DB_PORT}/retail_integration"
export INTEGRATION_DATABASE_URL="${DATABASE_URL}"

echo "Ejecutando pruebas contra migraciones <= ${MIGRATION_MAX} (${applied} archivos)..."
(
  cd "${ROOT_DIR}/backend"
  npm run test:integration
)
