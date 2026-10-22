import { error } from '@sveltejs/kit'
import { isEmptyRichText } from '#lib/editor/document.js'
import { renderRichText } from '#lib/editor/render.js'
import { loadSitePage } from '#lib/server/site.js'
import { SITE_PAGES } from '#lib/site.js'
import type { PageServerLoad } from './$types'

// Our own renderer's HTML ( never a visitor's ), so dropping its tags and undoing its few
// escapes is enough: the text, cut at a word near 160 characters.
const ENTITIES : Record<string, string> = { nbsp: ' ', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", amp: '&' }

const summaryOf = ( html : string ) => {
	const text = html.replace( /<[^>]+>/g, ' ' ).replace( /&(nbsp|lt|gt|quot|#39|#x27|amp);/g, ( _, name : string ) => ENTITIES[ name ] ).replace( /\s+/g, ' ' ).trim()

	return text.length <= 160 ? text : `${ text.slice( 0, 157 ).replace( /\s+\S*$/, '' ) }…`
}

/* ―― » A page the workspace wrote in Settings → Public site. Never a 404 for a known page:
        the footer may not link it yet, but someone may have the address — with no
        workspace ( a bare domain ) or nothing written, it says so. Pages are rich text, so
        they need the editor module in the build. */
export const load : PageServerLoad = async( { params } ) => {
	if ( !MODULES.editor )
		error( 404, 'Not found' )

	const body = await loadSitePage( params.page ).catch( () => null )
	const html = body && !isEmptyRichText( body ) ? renderRichText( body ) : null

	return {
		title  : SITE_PAGES[ params.page ](),
		html,
		// The description search results show: the page's opening words.
		summary: html ? summaryOf( html ) : undefined
	}
}
