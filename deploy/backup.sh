#!/bin/sh
# ―― » The backup service's loop ( deploy/docker-compose.yml ): once a day, the database
#      ( pg_dump custom format ), its roles ( app_rls's grants live there ) and the uploads.
#      Each file is written as .part and renamed when complete, so a dump cut short never
#      looks like a good one. Files older than BACKUP_KEEP_DAYS ( 14 ) are removed.
#      Restore: deploy/README.md.
set -eu

while true; do
	stamp=$( date -u +%Y%m%d-%H%M%S )

	pg_dump -Fc -f "/backups/db-$stamp.dump.part" && mv "/backups/db-$stamp.dump.part" "/backups/db-$stamp.dump"
	pg_dumpall --globals-only -f "/backups/roles-$stamp.sql.part" && mv "/backups/roles-$stamp.sql.part" "/backups/roles-$stamp.sql"
	tar -czf "/backups/uploads-$stamp.tar.gz.part" -C /uploads . && mv "/backups/uploads-$stamp.tar.gz.part" "/backups/uploads-$stamp.tar.gz"
	echo "backup $stamp done"

	find /backups -type f -mtime "+${BACKUP_KEEP_DAYS:-14}" -delete
	sleep 86400
done
