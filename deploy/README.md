# Deploying

One server with Docker runs everything: the app behind Caddy (HTTPS), Postgres, Redis and
a daily backup. The image is built by GitHub Actions and pulled by the server; this folder
is all the server needs.

| File | What it is |
|---|---|
| `docker-compose.yml` | The stack: `db`, `redis`, `migrate` (one shot), `app`, `caddy`, `backup` |
| `Caddyfile` | HTTPS for the domain, and on demand for workspace hosts |
| `.env.example` → `.env` | The stack's settings: image, domain, database passwords |
| `app.env.example` → `app.env` | The app's settings (tenancy, auth, first admin, social sign-in) |
| `first-run.sh` | Writes both env files with generated secrets, then starts everything |
| `upgrade.sh` | Pulls the image `.env` names and restarts (migrations run first) |
| `backup.sh` | The backup service's daily loop |

## Before you start

- **A server** with Docker Engine and the compose plugin, ports 80 and 443 open.
- **DNS:** an A (and AAAA) record for your domain pointing at the server. Shared tenancy
  also needs `*.<domain>` pointing there, for the workspaces' subdomains.
- **The image:** `.github/workflows/image.yml` pushes `ghcr.io/<owner>/<repo>` on every push
  to `main` (`:latest`) and every version tag (`:v1.2.0`). It builds the client config named
  by the repository variable `CLIENT` (Settings → Secrets and variables → Actions →
  Variables), else `default`. A private package needs a login on the server, once:
  `docker login ghcr.io -u <github-user>` with a token that has `read:packages`.

## First run

Copy this folder to the server (or clone the repository), then:

```bash
DOMAIN=example.com IMAGE=ghcr.io/you/app:latest ADMIN_EMAIL=you@example.com ./first-run.sh
```

It asks for anything you leave out, writes `.env` and `app.env` (mode 600) with generated
passwords and secrets, pulls the image and starts the stack. It prints the first admin's
password: sign in at `https://<domain>`, change it, then delete `ADMIN_PASSWORD` from
`app.env` (an existing account is never touched, so leaving it does no harm either).

Then set the workspace up from the app: **Settings → Mail** for outgoing email (until then,
nothing is sent), and whatever else your modules offer.

**On every start**, `migrate` runs before the app, as the database owner — the only
container that has the owner's password: it applies migrations, sets `app_rls`'s password,
and creates `TENANT_SLUG`'s workspace and the first admin when they're missing
(`bun run db:deploy`). The app connects as `app_rls`, so row-level security applies, and
refuses to start under a role that would bypass it.

## Shared tenancy

Set `TENANCY=shared` and `APP_DOMAIN=<domain>` in `app.env`. A workspace is then served at
`<slug>.<domain>`, or at its own `domain` (the customer points a CNAME at your domain). Caddy
gets each host's certificate the first time it is visited, after asking the app
(`/internal/tls-ask`) whether it belongs to an active workspace — anything else gets no
certificate. A new workspace and its admin, from the server:

```bash
docker compose run --rm -e TENANT_SLUG=acme -e TENANT_NAME="Acme" -e ADMIN_EMAIL=owner@acme.test -e ADMIN_PASSWORD=… migrate
```

## Per-workspace settings

The operator's scripts run through `migrate`, the container with the owner's password:

```bash
docker compose run --rm migrate bun run tenant:quota acme 20G      # or unlimited, default
docker compose run --rm migrate bun run tenant:modules acme -mail
```

## Upgrading

```bash
./upgrade.sh
```

Pulls the image, runs the migrations, replaces the app, and prunes old images. If a
migration fails, the app isn't replaced: `docker compose logs migrate`. To pin a version, set
`IMAGE=…:v1.2.0` in `.env`. Migrations only go forward, so going back to an older image
after one has run needs a restore.

## Backups

The `backup` service writes three files a day into `./backups` — `db-<time>.dump` (the
database), `roles-<time>.sql` (its roles and their passwords) and `uploads-<time>.tar.gz` —
and deletes those older than `BACKUP_KEEP_DAYS` (14). They're on the same disk as the data:
copy them somewhere else (`rsync`, object storage) on a schedule of your own.

**Restoring** into the running stack (a fresh server: run `first-run.sh` with the old `.env`
and `app.env` first):

```bash
docker compose stop app caddy
docker compose exec -T db psql -U postgres -d postgres < backups/roles-<time>.sql
docker compose exec -T db pg_restore -U postgres -d app --clean --if-exists < backups/db-<time>.dump
docker compose run --rm --no-deps -v ./backups:/backups --entrypoint sh app -c "tar -xzf /backups/uploads-<time>.tar.gz -C /app/uploads"
docker compose up -d
```

(The roles file says "already exists" for `postgres`; that's expected.)

## Running it

- `docker compose ps` — every service and its health. The app's health is `GET /health`
  (the database answers; Redis is reported, never fatal).
- `docker compose logs -f app` — the app, one JSON object per line, each request's lines
  sharing its `req` id (the `X-Request-ID` a visitor's browser got); `caddy`, `migrate`,
  `backup` likewise. `LOG_LEVEL=debug` in `app.env` adds a line per request.
- Caddy drops requests for other software's weak spots (`.php`, `/wp-*`, `/.env`, `/.git`),
  sets `X-Forwarded-For` itself (the app trusts nothing else for the visitor's address), and
  never lets `/internal/*` through from outside.

**Not included:** off-site backup copies, monitoring and alerts, more than one app
container (uploads are on a local volume and workspaces are cached per process), a staging
stack.
