import { error } from '@sveltejs/kit'
import { requireApiPermission } from '$lib/server/guards'
import { readMedia } from '$lib/server/media'
import type { RequestHandler } from './$types'

/* ―― » A stored file, to signed-in members of its workspace only: the row is looked up
        through RLS, so another workspace's id is a 404. Never cached by shared caches
        ( private ); never changes ( the id is the version ), so the browser keeps it.
        `sandbox` CSP: should a file ever be opened as a page, it can run nothing. */
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { media: [ 'list' ] } )

	const variant = event.params.variant

	if ( variant !== undefined && variant !== 'thumb' )
		error( 404 )

	const media = /^[0-9a-f-]{36}$/.test( event.params.id ) ? await readMedia( event.params.id, variant ) : null

	if ( !media )
		error( 404 )

	return new Response( media.body(), {
		headers: {
			'content-type'           : media.mime,
			'content-length'         : String( media.size ),
			'cache-control'          : 'private, max-age=31536000, immutable',
			'content-security-policy': 'default-src \'none\'; sandbox',
			// Images show in place; documents always download, under the name they came with.
			'content-disposition'    : `${ media.kind === 'image' ? 'inline' : 'attachment' }; filename*=UTF-8''${ encodeURIComponent( media.name ) }`
		}
	} )
}
