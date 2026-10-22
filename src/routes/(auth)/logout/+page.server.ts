import { redirect } from '@sveltejs/kit'
import { auth } from '#lib/server/auth.js'
import type { Actions, PageServerLoad } from './$types'

// Sign-out is a POST ( a GET link could be triggered by any page ). The GET shows a button.
export const load : PageServerLoad = async( event ) => {
	if ( !await event.locals.session() )
		redirect( 303, '/login' )
}

export const actions : Actions = {
	default: async( event ) => {
		await auth().api.signOut( { headers: event.request.headers } )
		redirect( 303, '/login' )
	}
}
