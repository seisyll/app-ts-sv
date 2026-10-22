import { error } from '@sveltejs/kit'
import { requireApiPermission } from '#lib/server/guards.js'
import { readMedia } from '#lib/server/media.js'
import type { RequestHandler } from './$types'

/* ―― » A stored file. The row is looked up through RLS first, so another workspace's id is
        a 404 whoever asks. A PUBLIC file then goes to anyone on this workspace's host ( a
        logo on the public site, an image in an email ); a private one only to signed-in
        members. Public copies may be cached by anyone for a day, so making a file private
        again takes up to that long to reach every cache; private ones only by the browser.
        Both never change ( the id is the version ). `sandbox` CSP: should a file ever be
        opened as a page, it can run nothing. */
export const GET : RequestHandler = async( event ) => {
	const variant = event.params.variant

	if ( variant !== undefined && variant !== 'thumb' )
		error( 404 )

	const media = /^[0-9a-f-]{36}$/.test( event.params.id ) ? await readMedia( event.params.id, variant ) : null

	if ( !media )
		error( 404 )

	if ( !media.public )
		await requireApiPermission( event, { media: [ 'list' ] } )

	return new Response( media.body(), {
		headers: {
			'content-type'           : media.mime,
			'content-length'         : String( media.size ),
			'cache-control'          : media.public ? 'public, max-age=86400' : 'private, max-age=31536000, immutable',
			'content-security-policy': 'default-src \'none\'; sandbox',
			// Images show in place; documents always download, under the name they came with.
			'content-disposition'    : `${ media.kind === 'image' ? 'inline' : 'attachment' }; filename*=UTF-8''${ encodeURIComponent( media.name ) }`
		}
	} )
}
