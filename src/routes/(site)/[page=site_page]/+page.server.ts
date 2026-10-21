import { error } from '@sveltejs/kit'
import { isEmptyRichText } from '$lib/editor/document'
import { renderRichText } from '$lib/editor/render'
import { loadSitePage } from '$lib/server/site'
import { SITE_PAGES } from '$lib/site'
import type { PageServerLoad } from './$types'

/* ―― » A page the workspace wrote in Settings → Public site. Never a 404 for a known page:
        the footer may not link it yet, but someone may have the address — with no
        workspace ( a bare domain ) or nothing written, it says so. Pages are rich text, so
        they need the editor module in the build. */
export const load : PageServerLoad = async( { params } ) => {
	if ( !MODULES.editor )
		error( 404, 'Not found' )

	const body = await loadSitePage( params.page ).catch( () => null )

	return {
		title: SITE_PAGES[ params.page ](),
		html : body && !isEmptyRichText( body ) ? renderRichText( body ) : null
	}
}
