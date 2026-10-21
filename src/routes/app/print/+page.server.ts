import { error } from '@sveltejs/kit'
import { m } from '$lib/paraglide/messages'
import type { PrintTable } from '$lib/server/export'
import type { PageServerLoad } from './$types'

// A list endpoint of this app, never better-auth's: the only thing ?src may name.
const SOURCE = /^\/api\/(?!auth\/)[a-z0-9\-/]+(\?[^#]*)?$/i

/* ―― » The print page ( billing-app's ): one list, every row, then the browser's own print —
        a PDF of any table without a PDF library. It reads one thing from its address, which
        list, and that can't make the app fetch anything else: only an /api/ path of this app,
        through event.fetch with the visitor's own session, so that endpoint's permission check
        decides what may be printed. Under /app ( signed in only ), but without the shell. */
export const load : PageServerLoad = async( { url, fetch } ) => {
	const src = url.searchParams.get( 'src' ) ?? ''

	if ( !SOURCE.test( src ) || src.includes( '..' ) || src.includes( '//' ) )
		error( 400, m.print_bad_source() )

	const target = new URL( src, url )

	target.searchParams.set( 'export', 'json' )

	const response = await fetch( `${ target.pathname }${ target.search }` )

	if ( !response.ok )
		error( response.status, m.print_failed() )

	return { table: await response.json() as PrintTable, printedAt: new Date().toISOString(), autoPrint: !url.searchParams.has( 'preview' ) }
}
