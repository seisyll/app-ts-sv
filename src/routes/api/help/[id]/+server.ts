import { error, json } from '@sveltejs/kit'
import { requireApiUser } from '#lib/server/guards.js'
import { helpArticle } from '#lib/server/help.js'
import type { RequestHandler } from './$types'

// GET — one help article as HTML, for the sheet that opens over any page ( HelpSheet ).
export const GET : RequestHandler = async( event ) => {
	await requireApiUser( event )

	const article = await helpArticle( event.params.id )

	if ( !article )
		error( 404, 'Not found' )

	return json( article, { headers: { 'cache-control': 'private, max-age=300' } } )
}
