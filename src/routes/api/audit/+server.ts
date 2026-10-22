import { json } from '@sveltejs/kit'
import { auditChangeLines, auditResourceLabel, auditSentence, type AuditRow } from '#lib/audit.js'
import { parsePageQuery } from '#lib/components/data-table/index.js'
import { m } from '#lib/paraglide/messages.js'
import { listAudit } from '#lib/server/audit.js'
import { describeQuery, exportAll, exportFormat, exportResponse, type ExportColumn } from '#lib/server/export.js'
import { requireApiPermission } from '#lib/server/guards.js'
import type { RequestHandler } from './$types'

const columns = () : ExportColumn<AuditRow>[] => [
	{ header: m.audit_when(), value: ( row ) => new Date( row.at ) },
	{ header: m.audit_who(), value: ( row ) => row.actorName },
	{ header: m.audit_what(), value: auditSentence },
	{ header: m.audit_changes(), value: ( row ) => auditChangeLines( row.changes ).join( '; ' ) },
	{ header: m.audit_ip(), value: ( row ) => row.ip }
]

// The trail, a page at a time for the table, or all of it filtered as a file ( ?export= ).
// Read only: there is no route that changes it.
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { audit: [ 'list' ] } )

	const query = parsePageQuery( event.url.searchParams )
	const format = exportFormat( event.url )

	if ( !format )
		return json( await listAudit( query ) )

	const filters = describeQuery( query, {
		search: m.print_search(),
		date  : m.audit_when(),
		facets: { resource: { title: m.audit_area(), options: Object.fromEntries( ( query.filters.resource ?? [] ).map( ( resource ) => [ resource, auditResourceLabel( resource ) ] ) ) } }
	} )

	return exportResponse( format, m.audit_title(), columns(), ( await listAudit( exportAll( query ) ) ).rows, { filters } )
}
