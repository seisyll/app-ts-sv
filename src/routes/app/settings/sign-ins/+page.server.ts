import { fromUrlParams, toPageQuery } from '$lib/components/data-table'
import { requirePermission } from '$lib/server/guards'
import { listSignIns, signInStats } from '$lib/server/sign-ins'
import type { PageServerLoad } from './$types'

// The first page as the address asks for it, and the last day's and fortnight's figures.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { signin: [ 'list' ] } )

	const [ entries, stats ] = await Promise.all( [ listSignIns( toPageQuery( fromUrlParams( event.url.searchParams ) ) ), signInStats() ] )

	return { entries, stats }
}
