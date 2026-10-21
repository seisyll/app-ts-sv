import { dev } from '$app/environment'
import { error, json } from '@sveltejs/kit'
import { mockNotifications } from '../../../demo-data'
import type { RequestHandler } from './$types'

// Mock inbox for the playground: a few made-up notifications in memory ( ?reset=1 refills ).
export const GET : RequestHandler = ( { url } ) => {
	if ( !dev )
		error( 404 )

	if ( url.searchParams.get( 'reset' ) === '1' )
		mockNotifications.reset()

	return json( { items: mockNotifications.items, unread: mockNotifications.items.filter( ( item ) => !item.readAt ).length } )
}
