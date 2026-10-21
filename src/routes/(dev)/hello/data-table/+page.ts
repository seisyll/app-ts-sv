import { error } from '@sveltejs/kit'
import type { Customer } from '../../demo-data'
import { fromUrlParams, toPageQuery, toSearchParams, type Paged } from '$lib/components/data-table'
import type { PageLoad } from './$types'

// The server-mode table's first page, loaded here so it is in the server render — the page
// the address asks for, since that table syncs its query to the URL.
export const load : PageLoad = async( { fetch, url } ) => {
	const params = toSearchParams( toPageQuery( fromUrlParams( url.searchParams ) ) )
	const response = await fetch( `/api/hello/customers?${ params }&delay=0` )

	if ( !response.ok )
		error( response.status, 'Mock API failed' )

	return { customers: await response.json() as Paged<Customer, { mrr : number }> }
}
