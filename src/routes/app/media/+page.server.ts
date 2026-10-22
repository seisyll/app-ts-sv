import { hasPermission } from '#lib/permissions.js'
import { requirePermission } from '#lib/server/guards.js'
import { listMedia } from '#lib/server/media.js'
import { storageUsage } from '#lib/server/storage.js'
import type { PageServerLoad } from './$types'

// The library. The first page of images comes with the server render; documents load when
// their tab is opened.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { media: [ 'list' ] } )

	return {
		images    : await listMedia( { skip: 0, take: 30, search: '', searchBy: 'all', filters: { kind: [ 'image' ] } } ),
		storage   : await storageUsage(),
		canUpload : hasPermission( user.role, { media: [ 'create' ] } ),
		canDelete : hasPermission( user.role, { media: [ 'delete' ] } ),
		canPublish: hasPermission( user.role, { media: [ 'publish' ] } )
	}
}
