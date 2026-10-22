import { dev } from '$app/env'
import { error } from '@sveltejs/kit'
import { m } from '#lib/paraglide/messages.js'
import { readJson } from '#lib/server/forms.js'
import { profileSchema } from '../../../hello/forms/schema'
import type { RequestHandler } from './$types'

// Mock save endpoint for the playground's API form: the real pattern — readJson with the
// form's own schema, plus a rule only the server can check. ?fail=1 simulates an outage.
export const PUT : RequestHandler = async( { request, url } ) => {
	if ( !dev )
		error( 404 )

	await new Promise( ( resolve ) => setTimeout( resolve, 700 ) )

	if ( url.searchParams.get( 'fail' ) === '1' )
		error( 503, 'Mock API is down ( toggled in the playground ).' )

	const profile = await readJson( request, profileSchema )

	// Only the server knows which addresses are in use: a field error, not a toast.
	if ( profile.email.toLowerCase() === 'taken@example.test' )
		error( 409, m.validation_failed(), { errors: { email: [ m.demo_forms_email_taken() ] } } )

	return Response.json( { profile, savedAt: new Date().toISOString() } )
}
