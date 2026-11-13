#!/usr/bin/env bash
# Nightly backup: PostgreSQL dump + uploaded images, kept 14 days locally and
# optionally copied off-site with rclone (RCLONE_REMOTE in .env).
# Cron (as the deploy user): 30 3 * * * /opt/arayanibul/deploy/backup.sh >> /opt/arayanibul/deploy/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ./.env; set +a

ts=$(date +%Y%m%d-%H%M)
mkdir -p backups

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-arayanibul}" -Fc "${POSTGRES_DB:-arayanibul}" > "backups/db-$ts.dump"

docker run --rm -v arayanibul_uploads:/data:ro -v "$PWD/backups:/out" alpine \
  tar czf "/out/uploads-$ts.tar.gz" -C /data .

find backups -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +14 -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy backups "$RCLONE_REMOTE" --include 'db-*' --include 'uploads-*' --max-age 25h
fi
echo "$(date -Is) backup ok: db-$ts.dump uploads-$ts.tar.gz"
