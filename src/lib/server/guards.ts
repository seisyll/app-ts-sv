import { error, redirect, type RequestEvent } from '@sveltejs/kit'
import { hasPermission, type Permission } from '#lib/permissions.js'
import type { Session } from '#lib/server/auth.js'

/* ―― » Page and endpoint guards ( from the fundraiser app's Access.ts ). The session comes
        from event.locals.session(), looked up once per request in hooks.server.ts.

          Pages:      const { user } = await requireUser( event )               // → /login
                      await requirePermission( event, { settings: [ 'update' ] } ) // → 404
          Endpoints:  await requireApiPermission( event, { … } )                // → 401 / 403

        A page the user may not see is a 404, not a 403: a protected route is
        indistinguishable from one that doesn't exist. Endpoints say 401/403 so a client
        can tell "sign in again" from "not allowed". */

export async function requireUser( event : RequestEvent ) : Promise<Session> {
	const session = await event.locals.session()

	if ( !session )
		redirect( 303, `/login?redirectTo=${ encodeURIComponent( event.url.pathname + event.url.search ) }` )

	return session
}

export async function requirePermission( event : RequestEvent, permission : Permission ) : Promise<Session> {
	const session = await requireUser( event )

	if ( !hasPermission( session.user.role, permission ) )
		error( 404, 'Not found' )

	return session
}

export async function requireApiUser( event : RequestEvent ) : Promise<Session> {
	const session = await event.locals.session()

	if ( !session )
		error( 401, 'Sign in required' )

	return session
}

export async function requireApiPermission( event : RequestEvent, permission : Permission ) : Promise<Session> {
	const session = await requireApiUser( event )

	if ( !hasPermission( session.user.role, permission ) )
		error( 403, 'Not allowed' )

	return session
}

// Where to send a user after sign-in: a same-site path only ( no open redirect ).
export function safeRedirect( target : string | null, fallback = '/app' ) : string {
	return target && target.startsWith( '/' ) && !target.startsWith( '//' ) && !target.startsWith( '/\\' ) ? target : fallback
}
