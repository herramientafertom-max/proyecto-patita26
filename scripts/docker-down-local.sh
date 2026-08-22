#!/usr/bin/env sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
DATABASE_URL=postgresql://unused:unused@localhost:5432/unused docker compose down
