import { error } from '@sveltejs/kit'
import { mediaUrl } from '$lib/media'
import { m } from '$lib/paraglide/messages'
import { db } from '$lib/server/db'
import { deleteMedia, saveMedia, setMediaPublic, sniff } from '$lib/server/media'

/* ―― » Uploaded avatars ( the fundraiser app's, one per person ). The picture is cropped
        square in the browser and stored as one of the workspace's media files — listed in
        the library, counted in its storage — made public, because it's shown wherever the
        person appears and in emails. users.avatar_id points at it; deleting the file from
        the library falls back to the provider's picture ( `image` ), then to initials. */

// The picture to show: the upload, else the sign-in provider's, else none ( initials ).
export const avatarUrl = ( user : { avatarId ?: string | null, image ?: string | null } ) : string | null =>
	( user.avatarId ? mediaUrl( user.avatarId, 'thumb' ) : user.image ) ?? null

// Replace someone's avatar with `file`; the old one is deleted. Answers the new URL.
export async function setAvatar( userId : string, file : File ) : Promise<string> {
	if ( sniff( new Uint8Array( await file.arrayBuffer() ) )?.kind !== 'image' )
		error( 415, m.avatar_not_image() )

	const previous = await db.user.findUnique( { where: { id: userId }, select: { avatarId: true } } )
	const media = await saveMedia( file, userId )

	await setMediaPublic( media.id, true )
	await db.user.update( { where: { id: userId }, data: { avatarId: media.id } } )

	if ( previous?.avatarId )
		await deleteMedia( previous.avatarId )

	return mediaUrl( media.id, 'thumb' )
}

// Take someone's uploaded avatar away ( the provider's picture, if any, shows again ).
// Answers whether there was one.
export async function removeAvatar( userId : string ) : Promise<boolean> {
	const user = await db.user.findUnique( { where: { id: userId }, select: { avatarId: true } } )

	if ( !user?.avatarId )
		return false

	// The foreign key clears avatar_id as the file goes.
	await deleteMedia( user.avatarId )

	return true
}
