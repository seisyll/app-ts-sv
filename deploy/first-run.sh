#!/bin/sh
# ―― » First start on a fresh server ( deploy/README.md ). Writes .env and app.env with
#      generated secrets — asking for what it can't make up — then starts the stack. Run
#      from anywhere; files that exist are kept, so running it again only starts things.
#
#        DOMAIN=example.com IMAGE=ghcr.io/you/app:latest ADMIN_EMAIL=you@example.com ./first-run.sh
set -eu
cd "$( dirname "$0" )"

command -v docker >/dev/null || { echo "Docker is not installed: https://docs.docker.com/engine/install/"; exit 1; }
command -v openssl >/dev/null || { echo "openssl is needed to generate the secrets."; exit 1; }

# The value from the environment, else asked for.
need() {
	eval "value=\${$1:-}"

	if [ -z "$value" ]; then
		printf '%s: ' "$2" >&2
		read -r value
	fi

	[ -n "$value" ] || { echo "$1 is required." >&2; exit 1; }
	echo "$value"
}

# KEY=value in a file, replacing the line that sets KEY.
set_key() {
	escaped=$( printf '%s' "$3" | sed 's/[&|]/\&/g' )
	sed -i.bak "s|^$2=.*|$2=$escaped|" "$1" && rm -f "$1.bak"
}

if [ ! -f .env ]; then
	cp .env.example .env
	set_key .env IMAGE "$( need IMAGE 'Image ( ghcr.io/<owner>/<repo>:latest )' )"
	set_key .env DOMAIN "$( need DOMAIN 'Domain ( example.com )' )"
	set_key .env POSTGRES_PASSWORD "$( openssl rand -hex 24 )"
	set_key .env APP_RLS_PASSWORD "$( openssl rand -hex 24 )"
	chmod 600 .env
	echo "✔ wrote .env"
fi

if [ ! -f app.env ]; then
	domain=$( sed -n 's/^DOMAIN=//p' .env )
	admin_password=$( openssl rand -base64 18 )

	cp app.env.example app.env
	set_key app.env TENANCY "${TENANCY:-single}"
	set_key app.env APP_DOMAIN "$domain"
	set_key app.env BETTER_AUTH_URL "https://$domain"
	set_key app.env BETTER_AUTH_SECRET "$( openssl rand -base64 32 )"
	set_key app.env ADMIN_EMAIL "$( need ADMIN_EMAIL 'First admin email' )"
	set_key app.env ADMIN_PASSWORD "$admin_password"
	chmod 600 app.env
	echo "✔ wrote app.env — first admin's password: $admin_password ( change it after signing in )"
fi

mkdir -p backups
docker compose pull
docker compose up -d
echo "✔ started. Open https://$( sed -n 's/^DOMAIN=//p' .env ) once DNS points here."
