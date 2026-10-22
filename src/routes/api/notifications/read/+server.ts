import * as v from 'valibot'
import { readJson } from '#lib/server/forms.js'
import { requireApiUser } from '#lib/server/guards.js'
import { markRead } from '#lib/server/notifications/index.js'
import type { RequestHandler } from './$types'

// POST { ids? } — mark the caller's own notifications read: these, or all. Another user's
// ids simply match nothing.
export const POST : RequestHandler = async( event ) => {
	const { user } = await requireApiUser( event )
	const { ids } = await readJson( event.request, v.object( { ids: v.optional( v.pipe( v.array( v.pipe( v.string(), v.uuid() ) ), v.maxLength( 100 ) ) ) } ) )

	return Response.json( { count: await markRead( user.id, ids ) } )
}
