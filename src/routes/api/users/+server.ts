import { error, json } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { parsePageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import { audit } from '$lib/server/audit'
import { auth } from '$lib/server/auth'
import { isAuthError, rethrowAuthError } from '$lib/server/auth-errors'
import { describeQuery, exportAll, exportFormat, exportResponse, type ExportColumn } from '$lib/server/export'
import { readJson } from '$lib/server/forms'
import { requireApiPermission } from '$lib/server/guards'
import { mailReady } from '$lib/server/mail/gate'
import { notify } from '$lib/server/notifications/gate'
import { createUser, listUsers } from '$lib/server/users'
import { newUserSchema, roleLabel, type UserRow } from '$lib/users'
import type { RequestHandler } from './$types'

const status = ( row : UserRow ) => ( row.banned ? m.users_status_banned() : row.invited ? m.users_status_invited() : m.users_status_active() )

// The table's columns as a file ( functions: built in the request's language ).
const columns = () : ExportColumn<UserRow>[] => [
	{ header: m.users_name(), value: ( row ) => row.name },
	{ header: m.users_email(), value: ( row ) => row.email },
	{ header: m.users_role(), value: ( row ) => roleLabel( row.role ) },
	{ header: m.users_status(), value: status },
	{ header: m.users_created(), value: ( row ) => new Date( row.createdAt ) }
]

// The Users table's data source ( TableSource ) and its Add user dialog; ?export= answers the
// whole filtered list as a file, or as the print page's table.
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { user: [ 'list' ] } )

	const query = parsePageQuery( event.url.searchParams )
	const format = exportFormat( event.url )

	if ( !format )
		return json( await listUsers( query ) )

	const filters = describeQuery( query, {
		search: m.print_search(),
		date  : m.users_created(),
		facets: {
			role  : { title: m.users_role(), options: { admin: m.users_role_admin(), member: m.users_role_member() } },
			status: { title: m.users_status(), options: { active: m.users_status_active(), invited: m.users_status_invited(), banned: m.users_status_banned() } }
		}
	} )

	return exportResponse( format, m.app_nav_users(), columns(), ( await listUsers( exportAll( query ) ) ).rows, { filters } )
}

export const POST : RequestHandler = async( event ) => {
	const { user } = await requireApiPermission( event, { user: [ 'create' ] } )
	const input = await readJson( event.request, newUserSchema )

	// No password means an invite, which needs a way to send it.
	if ( !input.password && !await mailReady() )
		error( 400, { message: m.validation_failed(), errors: { password: [ m.users_password_needed() ] } } )

	await createUser( auth(), event.request.headers, input, user.name ).catch( ( caught ) => {
		if ( isAuthError( caught, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ) || isAuthError( caught, 'USER_ALREADY_EXISTS' ) )
			error( 409, { message: m.validation_failed(), errors: { email: [ m.auth_email_taken() ] } } )

		if ( caught instanceof APIError )
			rethrowAuthError( caught )

		// The invite email didn't go ( createUser already took the account back out ).
		console.error( '[users] invite failed', caught )
		error( 502, { message: m.users_invite_failed() } )
	} )

	// The other admins hear about it; the one who added them already knows.
	await notify( { type: 'user.joined', params: { name: input.name, email: input.email }, to: { roles: [ 'admin' ], except: [ user.id ] } } )

	await audit( event, { action: input.password ? 'user.create' : 'user.invite', target: { label: `${ input.name } <${ input.email }>` } } )

	return json( { ok: true }, { status: 201 } )
}
