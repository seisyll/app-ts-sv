import { publishedSitePages } from '$lib/server/site'

/* ―― » The public pages of the workspace this host serves: home, and each page it has
        published ( Settings → Public site ). Built per request, so every workspace in shared
        tenancy has its own; with no workspace ( a bare domain ), home alone. */
export const GET = async( { url } ) => {
	const pages = MODULES.editor ? await publishedSitePages().catch( () => [] as string[] ) : []
	const entries = [ '/', ...pages.map( ( key ) => `/${ key }` ) ].map( ( path ) => `\t<url><loc>${ url.origin }${ path }</loc></url>` )

	return new Response( `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ entries.join( '\n' ) }\n</urlset>\n`, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	} )
}
