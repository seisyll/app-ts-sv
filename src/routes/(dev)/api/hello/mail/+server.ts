import { dev } from '$app/env'
import { error, json } from '@sveltejs/kit'
import { MAIL_TEMPLATE_KEYS, renderMail, sampleMailValues } from '#lib/server/mail/index.js'
import { clearOutbox, listOutbox, record } from '#lib/server/mail/outbox.js'
import type { RequestHandler } from './$types'

/* ―― » The dev outbox ( #lib/server/mail/outbox ): what the app sent, newest first. POST adds
        one of every email, rendered from its default with made-up values — no database, so
        it works in the playground too. DELETE empties it. */
export const GET : RequestHandler = () => {
	if ( !dev )
		error( 404 )

	return json( listOutbox() )
}

export const POST : RequestHandler = ( { url } ) => {
	if ( !dev )
		error( 404 )

	const values = sampleMailValues()

	for ( const key of MAIL_TEMPLATE_KEYS )
		record( { workspace: values.workspace, to: 'ada@example.test', ...renderMail( key, { values, baseUrl: url.origin } ), sent: false } )

	return json( listOutbox() )
}

export const DELETE : RequestHandler = () => {
	if ( !dev )
		error( 404 )

	clearOutbox()

	return json( [] )
}
