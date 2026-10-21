import { hasPermission } from '$lib/permissions'
import { requirePermission } from '$lib/server/guards'
import { listMedia } from '$lib/server/media'
import type { PageServerLoad } from './$types'

// The library. The first page of images comes with the server render; documents load when
// their tab is opened.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { media: [ 'list' ] } )

	return {
		images    : await listMedia( { skip: 0, take: 30, search: '', searchBy: 'all', filters: { kind: [ 'image' ] } } ),
		canUpload : hasPermission( user.role, { media: [ 'create' ] } ),
		canDelete : hasPermission( user.role, { media: [ 'delete' ] } ),
		canPublish: hasPermission( user.role, { media: [ 'publish' ] } )
	}
}
