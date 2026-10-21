import { error, json } from '@sveltejs/kit'
import { parsePageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import { requireApiPermission } from '$lib/server/guards'
import { listMedia, saveMedia } from '$lib/server/media'
import type { RequestHandler } from './$types'

// GET — the library, one page at a time ( the DataTable query contract; filter by kind ).
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'list' ] } )

	return json( await listMedia( parsePageQuery( event.url.searchParams ) ) )
}

// POST — one upload: multipart with a single `file`. One per request keeps each under the
// body limit and gives every file its own answer.
export const POST : RequestHandler = async( event ) => {
	const { user } = await requireApiPermission( event, { media: [ 'create' ] } )
	const file = ( await event.request.formData().catch( () => undefined ) )?.get( 'file' )

	if ( !( file instanceof File ) || file.size === 0 )
		error( 400, m.media_no_file() )

	return json( await saveMedia( file, user.id ), { status: 201 } )
}
