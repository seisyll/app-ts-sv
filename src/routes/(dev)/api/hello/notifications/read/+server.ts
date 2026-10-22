import { dev } from '$app/env'
import { error, json } from '@sveltejs/kit'
import { mockNotifications } from '../../../../demo-data'
import type { RequestHandler } from './$types'

export const POST : RequestHandler = async( { request } ) => {
	if ( !dev )
		error( 404 )

	const { ids } = await request.json().catch( () => ( {} ) ) as { ids ?: string[] }

	return json( { count: mockNotifications.markRead( ids ) } )
}
