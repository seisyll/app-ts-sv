import { parsePageQuery } from '#lib/components/data-table/index.js'
import { m } from '#lib/paraglide/messages.js'
import { deviceLabel, methodLabel, outcomeLabel, SIGN_IN_METHODS, SIGN_IN_OUTCOMES, type SignInRow } from '#lib/sign-ins.js'
import { describeQuery, exportAll, exportFormat, exportResponse, type ExportColumn } from '#lib/server/export.js'
import { requireApiPermission } from '#lib/server/guards.js'
import { listSignIns } from '#lib/server/sign-ins.js'
import type { RequestHandler } from './$types'

const columns = () : ExportColumn<SignInRow>[] => [
	{ header: m.audit_when(), value: ( row ) => new Date( row.at ) },
	{ header: m.auth_email(), value: ( row ) => row.email },
	{ header: m.signins_outcome(), value: ( row ) => outcomeLabel( row.outcome ) },
	{ header: m.signins_method(), value: ( row ) => methodLabel( row.method ) },
	{ header: m.audit_ip(), value: ( row ) => row.ip },
	{ header: m.signins_device(), value: ( row ) => deviceLabel( row.userAgent ) }
]

// The sign-in log, a page at a time for the table or all of it filtered as a file.
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { signin: [ 'list' ] } )

	const query = parsePageQuery( event.url.searchParams )
	const format = exportFormat( event.url )

	if ( !format )
		return Response.json( await listSignIns( query ) )

	const filters = describeQuery( query, {
		search: m.print_search(),
		date  : m.audit_when(),
		facets: {
			outcome: { title: m.signins_outcome(), options: Object.fromEntries( SIGN_IN_OUTCOMES.map( ( outcome ) => [ outcome, outcomeLabel( outcome ) ] ) ) },
			method : { title: m.signins_method(), options: Object.fromEntries( SIGN_IN_METHODS.map( ( method ) => [ method, methodLabel( method ) ] ) ) }
		}
	} )

	return exportResponse( format, m.signins_title(), columns(), ( await listSignIns( exportAll( query ) ) ).rows, { filters } )
}
