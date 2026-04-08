#!/bin/bash

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
POSTGRES_URL="${POSTGRES_URL:-postgresql://postgres:password@localhost:5432/laptop_aggregator}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

echo "[$(date)] Starting database backup..."

pg_dump -h "$(echo $POSTGRES_URL | sed -E 's|.*@||' | sed -E 's|:.*||')" \
        -U "$(echo $POSTGRES_URL | sed -E 's|.*://||' | sed -E 's|:.*||')" \
        -d laptop_aggregator \
        -f "$BACKUP_FILE" \
        --no-owner \
        --no-acl \
        -Fc

gzip "$BACKUP_FILE"

echo "[$(date)] Backup created: ${BACKUP_FILE}.gz"

find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed. Old backups cleaned up."