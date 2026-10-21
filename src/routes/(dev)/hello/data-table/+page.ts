import { error } from '@sveltejs/kit'
import type { Customer } from '../../demo-data'
import type { Paged } from '$lib/components/data-table'
import type { PageLoad } from './$types'

// The server-mode table's first page, loaded here so it is in the server render.
export const load : PageLoad = async( { fetch } ) => {
	const response = await fetch( '/api/hello/customers?skip=0&take=10&delay=0' )

	if ( !response.ok )
		error( response.status, 'Mock API failed' )

	return { customers: await response.json() as Paged<Customer, { mrr : number }> }
}
