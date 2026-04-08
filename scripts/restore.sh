#!/bin/bash

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

POSTGRES_URL="${POSTGRES_URL:-postgresql://postgres:password@localhost:5432/laptop_aggregator}"

echo "[$(date)] Restoring database from: $BACKUP_FILE"

gunzip -k "$BACKUP_FILE"

RESTORE_FILE="${BACKUP_FILE%.gz}"

pg_restore -h "$(echo $POSTGRES_URL | sed -E 's|.*@||' | sed -E 's|:.*||')" \
           -U "$(echo $POSTGRES_URL | sed -E 's|.*://||' | sed -E 's|:.*||')" \
           -d laptop_aggregator \
           -c \
           -e \
           "$RESTORE_FILE"

rm -f "$RESTORE_FILE"

echo "[$(date)] Database restore completed."