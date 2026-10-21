# syntax=docker/dockerfile:1

# ―― » The production image ( deploy/README.md ): the SvelteKit server built for one client
#      config, plus what the one-shot migrate service runs — the Prisma CLI, the migrations,
#      the app_rls provisioning and the seed. No secrets at build time: everything is read
#      from the environment when a container starts.
#
#        docker build --build-arg CLIENT=default -t app .
ARG BUN_VERSION=1.4

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# Which config/clients/<name>.ts to build: modules and theme are fixed at build time.
ARG CLIENT=default
ENV CLIENT=${CLIENT}
# sync first: prisma.config.ts is loaded through tsconfig.json, which extends .svelte-kit's.
RUN bunx svelte-kit sync && bunx prisma generate && bun run build

# Production dependencies only. Install scripts run here ( unlike above ): Prisma's fetches
# the schema engine that `prisma migrate deploy` needs, into node_modules, as root — the
# runtime user couldn't write there later.
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock prisma.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile --production

FROM oven/bun:${BUN_VERSION}
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	UPLOAD_ROOT=/app/uploads
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# The seed imports the generated client directly ( it runs outside the build ).
COPY --from=build /app/src/lib/server/db/generated ./src/lib/server/db/generated
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
# The operator's scripts, run through the migrate service ( it has the owner's password ):
# docker compose run --rm migrate bun run tenant:quota acme 20G
COPY scripts/db-provision.ts scripts/tenant-modules.ts scripts/tenant-quota.ts ./scripts/
COPY config/modules.ts ./config/
COPY src/lib/bytes.ts ./src/lib/
# Owned by the runtime user, so a named volume mounted here starts out writable.
RUN mkdir -p uploads && chown bun:bun uploads
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD bun -e "fetch( 'http://127.0.0.1:3000/health' ).then( ( r ) => process.exit( r.ok ? 0 : 1 ), () => process.exit( 1 ) )"
CMD [ "bun", "build/index.js" ]
