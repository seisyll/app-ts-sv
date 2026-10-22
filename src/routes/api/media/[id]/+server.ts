import { error, json } from '@sveltejs/kit'
import * as v from 'valibot'
import { audit } from '#lib/server/audit.js'
import { readJson } from '#lib/server/forms.js'
import { requireApiPermission } from '#lib/server/guards.js'
import { deleteMedia, setMediaPublic } from '#lib/server/media.js'
import type { RequestHandler } from './$types'

// PATCH { public } — served without a session, or members only again. Answers the row.
export const PATCH : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'publish' ] } )

	const { public: value } = await readJson( event.request, v.object( { public: v.boolean() } ) )
	const media = await setMediaPublic( event.params.id, value )

	if ( !media )
		error( 404 )

	await audit( event, { action: value ? 'media.publish' : 'media.unpublish', target: { id: media.id, label: media.name } } )

	return json( media )
}

// DELETE — the row and its files. Records that pointed at it keep a dangling id; the media
// field shows it as missing, so nothing breaks.
export const DELETE : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'delete' ] } )

	const name = await deleteMedia( event.params.id )

	if ( name === null )
		error( 404 )

	await audit( event, { action: 'media.delete', target: { id: event.params.id, label: name } } )

	return json( { ok: true } )
}
