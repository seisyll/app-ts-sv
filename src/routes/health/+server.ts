import { json } from '@sveltejs/kit'
import { prisma } from '#lib/server/db/index.js'
import { redisReady } from '#lib/server/redis.js'

/* ―― » For the container's HEALTHCHECK and anything else that watches the app ( no tenant,
        no session ). Healthy means the database answers within two seconds; Redis is
        reported but never fails it — the throttle runs without it, and restarting the app
        would not bring Redis back. No details beyond up or down: anyone can ask. */
export const GET = async() => {
	const database = await Promise.race( [
		prisma.$queryRaw`SELECT 1`.then( () => true, () => false ),
		new Promise<boolean>( ( resolve ) => setTimeout( resolve, 2_000, false ) )
	] )
	const redis = process.env.REDIS_URL ? ( redisReady() ? 'up' : 'down' ) : 'off'

	return json( { status: database ? 'ok' : 'down', database: database ? 'up' : 'down', redis }, { status: database ? 200 : 503, headers: { 'cache-control': 'no-store' } } )
}
