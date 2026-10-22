import { fromUrlParams, toPageQuery } from '#lib/components/data-table/index.js'
import { listAudit } from '#lib/server/audit.js'
import { requirePermission } from '#lib/server/guards.js'
import type { PageServerLoad } from './$types'

// The first page comes with the server render — the one the address asks for; later pages
// from /api/audit.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { audit: [ 'list' ] } )

	return { entries: await listAudit( toPageQuery( fromUrlParams( event.url.searchParams ) ) ) }
}
