/* ―― » For crawlers on this host: stay out of the app and the API ( their pages also say
        noindex — hooks.server.ts ), and here is the sitemap. SEO_INDEX=false keeps them out
        of everything, for a staging copy. */
export const GET = ( { url } ) => {
	const lines = process.env.SEO_INDEX === 'false'
		? [ 'User-agent: *', 'Disallow: /' ]
		: [ 'User-agent: *', 'Disallow: /app', 'Disallow: /api', ...( MODULES.site ? [ '', `Sitemap: ${ url.origin }/sitemap.xml` ] : [] ) ]

	return new Response( `${ lines.join( '\n' ) }\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } } )
}
