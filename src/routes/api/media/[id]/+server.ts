import { error, json } from '@sveltejs/kit'
import { requireApiPermission } from '$lib/server/guards'
import { deleteMedia } from '$lib/server/media'
import type { RequestHandler } from './$types'

// DELETE — the row and its files. Records that pointed at it keep a dangling id; the media
// field shows it as missing, so nothing breaks.
export const DELETE : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'delete' ] } )

	if ( !await deleteMedia( event.params.id ) )
		error( 404 )

	return json( { ok: true } )
}
