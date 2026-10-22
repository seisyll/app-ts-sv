import { error } from '@sveltejs/kit'
import { prisma } from '#lib/server/db/index.js'
import { normaliseHost, subdomainOf, tenancy } from '#lib/server/tenant.js'

/* ―― » Caddy's on-demand TLS asks here before it requests a certificate for a host it has
        never seen ( deploy/Caddyfile ): 200 for an active workspace's custom domain or its
        <slug>.APP_DOMAIN, 404 for anything else — so a stranger pointing DNS at the server
        can't make it fetch certificates for names that aren't ours. Single tenancy has
        nothing to approve: the site's one domain gets its certificate at startup.

        Caddy calls the app on the internal network; the public side never reaches /internal
        ( the Caddyfile aborts it ). */
export const GET = async( { url } ) => {
	const domain = url.searchParams.get( 'domain' )

	if ( !domain )
		error( 400, 'domain is required' )

	if ( tenancy() !== 'shared' )
		error( 404, 'Not found' )

	const host = normaliseHost( domain )
	const sub = subdomainOf( host, process.env.APP_DOMAIN || 'localhost' )
	const tenant = await prisma.tenant.findFirst( { where: { status: 'active', OR: [ { domain: host }, ...( sub ? [ { slug: sub } ] : [] ) ] }, select: { id: true } } )

	if ( !tenant )
		error( 404, 'Not found' )

	return new Response( 'ok' )
}
