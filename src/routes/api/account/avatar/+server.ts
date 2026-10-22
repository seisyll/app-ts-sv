import { error } from '@sveltejs/kit'
import { m } from '#lib/paraglide/messages.js'
import { audit } from '#lib/server/audit.js'
import { removeAvatar, setAvatar } from '#lib/server/avatars.js'
import { requireApiUser } from '#lib/server/guards.js'
import type { RequestHandler } from './$types'

// POST — your own new avatar: multipart with one `file`, already cropped square ( AvatarField ).
export const POST : RequestHandler = async( event ) => {
	const { user } = await requireApiUser( event )
	const file = ( await event.request.formData().catch( () => undefined ) )?.get( 'file' )

	if ( !( file instanceof File ) || file.size === 0 )
		error( 400, m.media_no_file() )

	const url = await setAvatar( user.id, file )

	await audit( event, { action: 'account.avatar' } )

	return Response.json( { url } )
}

// DELETE — back to your sign-in provider's picture, or initials.
export const DELETE : RequestHandler = async( event ) => {
	const { user } = await requireApiUser( event )

	if ( await removeAvatar( user.id ) )
		await audit( event, { action: 'account.avatar-remove' } )

	return new Response( null, { status: 204 } )
}
