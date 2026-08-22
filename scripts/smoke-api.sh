#!/usr/bin/env sh
set -eu

base_url="${BASE_URL:-http://127.0.0.1:3000/api/v1}"
demo_password="${DEMO_PASSWORD:-retail-demo-local}"

curl --silent --show-error --fail "$base_url/health" >/dev/null
login=$(curl --silent --show-error --fail -H 'Content-Type: application/json' -d "{\"password\":\"$demo_password\"}" "$base_url/auth/demo")
token=$(printf '%s' "$login" | jq -r '.accessToken')
stores=$(curl --silent --show-error --fail -H "Authorization: Bearer $token" "$base_url/stores?limit=1")
store_id=$(printf '%s' "$stores" | jq -r '.items[0].id')
test "$store_id" != "null"
products=$(curl --silent --show-error --fail -H "Authorization: Bearer $token" "$base_url/stores/$store_id/products?limit=1")
product_id=$(printf '%s' "$products" | jq -r '.items[0].id')
test "$product_id" != "null"
curl --silent --show-error --fail -H "Authorization: Bearer $token" "$base_url/stores/$store_id/products/$product_id/history?days=30" >/dev/null
printf '%s\n' 'smoke_api=ok'
