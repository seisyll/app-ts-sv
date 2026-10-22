import { dev } from '$app/env'
import { error } from '@sveltejs/kit'
import * as v from 'valibot'
import { richTextSchema } from '#lib/editor/document.js'
import { renderEmailHTML, renderRichText } from '#lib/editor/render.js'
import { readJson } from '#lib/server/forms.js'
import type { RequestHandler } from './$types'

// The playground's save: the real server path — validate with richTextSchema, then render
// for the app and for an email ( variables filled in from sample values ).
export const POST : RequestHandler = async( { request, url } ) => {
	if ( !dev )
		error( 404 )

	const { content } = await readJson( request, v.object( { content: richTextSchema } ) )

	return Response.json( {
		content,
		html : renderRichText( content ),
		email: renderEmailHTML( content, { baseUrl: url.origin, values: { customer_name: 'Ada Lovelace', invoice_total: '$1,250.00', invoice_link: 'https://example.test/invoice/42' } } )
	} )
}
