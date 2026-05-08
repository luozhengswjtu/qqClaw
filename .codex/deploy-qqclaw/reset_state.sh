#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/opt/qqclaw"
DATA_DIR="$ROOT/data"
BACKUP_DIR="$ROOT/backups"
COMPOSE_FILE="$ROOT/docker-compose.yml"
API_SERVICE="qqclaw-api"
DOMAIN="https://qqclaw.xiaobinke.com"

MODE=""
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage:
  /opt/qqclaw/scripts/reset_state.sh --db-only [--dry-run]
  /opt/qqclaw/scripts/reset_state.sh --full [--dry-run]

Options:
  --db-only   Reset SQLite state only, preserving generated images.
  --full      Reset SQLite state and generated images.
  --dry-run   Print planned actions without changing files or containers.
  -h, --help  Show this help.
USAGE
}

log() {
  printf '[reset_state] %s\n' "$*"
}

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --db-only)
      MODE="db-only"
      ;;
    --full)
      MODE="full"
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if [ -z "$MODE" ]; then
  printf 'Missing required mode: --db-only or --full\n\n' >&2
  usage >&2
  exit 2
fi

if [ ! -d "$ROOT" ] || [ ! -f "$COMPOSE_FILE" ]; then
  printf 'Expected QQClaw deployment at %s with docker-compose.yml\n' "$ROOT" >&2
  exit 1
fi

case "$DATA_DIR" in
  "$ROOT"/data) ;;
  *)
    printf 'Refusing unexpected data dir: %s\n' "$DATA_DIR" >&2
    exit 1
    ;;
esac

STAMP="$(date -u +%Y%m%d%H%M%S)"
RUN_BACKUP_DIR="$BACKUP_DIR/reset-$STAMP"

log "mode=$MODE dry_run=$DRY_RUN"
log "root=$ROOT"
log "backup=$RUN_BACKUP_DIR"

if [ "$DRY_RUN" -eq 0 ]; then
  mkdir -p "$RUN_BACKUP_DIR"
fi

if compgen -G "$DATA_DIR/openclaw.sqlite*" >/dev/null; then
  log "backing up SQLite files"
  if [ "$DRY_RUN" -eq 1 ]; then
    for file in "$DATA_DIR"/openclaw.sqlite*; do
      [ -e "$file" ] || continue
      log "would copy $file -> $RUN_BACKUP_DIR/"
    done
  else
    cp -a "$DATA_DIR"/openclaw.sqlite* "$RUN_BACKUP_DIR"/
  fi
else
  log "no SQLite files found to back up"
fi

if [ "$MODE" = "full" ] && [ -d "$DATA_DIR/generated-images" ]; then
  log "backing up generated images"
  run tar -C "$DATA_DIR" -czf "$RUN_BACKUP_DIR/generated-images.tar.gz" generated-images
fi

log "stopping $API_SERVICE"
run docker compose -f "$COMPOSE_FILE" --project-directory "$ROOT" stop "$API_SERVICE"

log "removing SQLite files"
if [ "$DRY_RUN" -eq 1 ]; then
  for file in "$DATA_DIR"/openclaw.sqlite "$DATA_DIR"/openclaw.sqlite-wal "$DATA_DIR"/openclaw.sqlite-shm; do
    log "would remove $file"
  done
else
  rm -f "$DATA_DIR"/openclaw.sqlite "$DATA_DIR"/openclaw.sqlite-wal "$DATA_DIR"/openclaw.sqlite-shm
fi

if [ "$MODE" = "full" ]; then
  log "removing generated images"
  run rm -rf "$DATA_DIR/generated-images"
fi

log "starting $API_SERVICE"
run docker compose -f "$COMPOSE_FILE" --project-directory "$ROOT" up -d "$API_SERVICE"

if [ "$DRY_RUN" -eq 0 ]; then
  log "waiting for API health"
  for _ in $(seq 1 30); do
    if docker exec qqclaw-qqclaw-api-1 node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      log "API is healthy"
      break
    fi
    sleep 1
  done

  if ! docker exec qqclaw-qqclaw-api-1 node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    log "API health check failed"
    docker compose -f "$COMPOSE_FILE" --project-directory "$ROOT" ps
    exit 1
  fi
fi

log "done"
log "backup saved at $RUN_BACKUP_DIR"
log "verify with: curl -sS $DOMAIN/openclaw/health"
