import { error, json } from '@sveltejs/kit'
import * as v from 'valibot'
import { readJson } from '$lib/server/forms'
import { requireApiPermission } from '$lib/server/guards'
import { deleteMedia, setMediaPublic } from '$lib/server/media'
import type { RequestHandler } from './$types'

// PATCH { public } — served without a session, or members only again. Answers the row.
export const PATCH : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'publish' ] } )

	const { public: value } = await readJson( event.request, v.object( { public: v.boolean() } ) )
	const media = await setMediaPublic( event.params.id, value )

	if ( !media )
		error( 404 )

	return json( media )
}

// DELETE — the row and its files. Records that pointed at it keep a dangling id; the media
// field shows it as missing, so nothing breaks.
export const DELETE : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'delete' ] } )

	if ( !await deleteMedia( event.params.id ) )
		error( 404 )

	return json( { ok: true } )
}
