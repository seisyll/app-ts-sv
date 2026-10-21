import { error } from '@sveltejs/kit'
import type { HelloResponse } from '../api/hello/+server'
import type { PageLoad } from './$types'

export const load : PageLoad = async( { fetch } ) => {
	const res = await fetch( '/api/hello' )

	if ( !res.ok ) error( res.status, 'Mock API failed' )

	return { hello: await res.json() as HelloResponse }
}
