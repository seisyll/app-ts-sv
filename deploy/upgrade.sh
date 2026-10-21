#!/bin/sh
# ―― » Move to the image .env names ( a new :latest, or edit IMAGE to pin a version ). The
#      migrate service runs before the new app starts; if it fails, `up` stops before the app
#      is replaced —
#      see `docker compose logs migrate`.
set -eu
cd "$( dirname "$0" )"

docker compose pull
docker compose up -d
docker image prune -f
