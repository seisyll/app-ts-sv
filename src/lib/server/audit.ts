import type { RequestEvent } from '@sveltejs/kit'
import type { Paged, PageQuery } from '#lib/components/data-table/index.js'
import type { AuditAction, AuditChanges, AuditRow } from '#lib/audit.js'
import { db } from '#lib/server/db/index.js'
import { listArgs, type ListSpec } from '#lib/server/list.js'
import { log } from '#lib/server/log.js'
import { moduleActive } from '#lib/server/modules.js'

/* ―― » The audit trail's writer ( billing-app's recordAudit ). Called by every handler that
        changes something — there is no automatic interception: what changed is only sayable
        where it happened — and a test ( audit-coverage.test.ts ) fails when a mutating route
        records nothing without a written reason.

        AWAITED, never fire-and-forget ( a floating promise can be dropped when the request
        ends ), and it NEVER fails the change it describes: that already happened, and refusing
        to say so would be the worse lie. A failure goes to the log. The actor's name is a
        snapshot; with no session ( a sign-up, a reset link ) pass `actor`. */

export type AuditEntry = {
	action    : AuditAction
	target ?  : { id ?: string | null, label : string }
	changes ? : AuditChanges | null
	// Who acted, when the request's session doesn't say.
	actor ?   : { id : string | null, name : string }
}

export async function audit( event : RequestEvent, entry : AuditEntry ) : Promise<void> {
	if ( !MODULES.audit )
		return

	try {
		if ( !await moduleActive( 'audit' ) )
			return

		const user = entry.actor ?? ( await event.locals.session() )?.user
		const changes = entry.changes && Object.keys( entry.changes ).length ? entry.changes : undefined

		await db.auditLog.create( { data: {
			actorId  : user?.id ?? null,
			actorName: user?.name ?? '—',
			action   : entry.action,
			targetId : entry.target?.id ?? null,
			target   : entry.target?.label ?? null,
			changes  : changes as object | undefined,
			ip       : event.getClientAddress()
		} } )
	} catch ( caught ) {
		log.error( { err: caught, scope: 'audit', action: entry.action }, "couldn't record an entry" )
	}
}

/* ―― » The fields that differ between two versions of a record: { field: [ before, after ] }.
        `secret` fields are reported as changed ( null ) when a new value was given, never
        with a value. */
export function changesBetween( before : object | null | undefined, after : object, { secret = [] } : { secret ?: string[] } = {} ) : AuditChanges {
	const old = ( before ?? {} ) as Record<string, unknown>
	const changes : AuditChanges = {}

	for ( const [ field, value ] of Object.entries( after ) ) {
		if ( secret.includes( field ) ) {
			if ( value )
				changes[ field ] = null
		} else if ( JSON.stringify( old[ field ] ?? null ) !== JSON.stringify( value ?? null ) ) {
			changes[ field ] = [ old[ field ] ?? null, value ?? null ]
		}
	}

	return changes
}

const LIST : ListSpec = {
	search     : [ 'actorName', 'target' ],
	facets     : {
		resource: ( values ) => ( { OR: values.map( ( resource ) => ( { action: { startsWith: `${ resource }.` } } ) ) } ),
		action  : ( values ) => ( { action: { in: values } } )
	},
	sort       : [ 'at', 'actorName', 'action' ],
	defaultSort: { at: 'desc' },
	date       : 'at'
}

export async function listAudit( query : PageQuery ) : Promise<Paged<AuditRow>> {
	const args = listArgs( query, LIST )
	const [ rows, total ] = await Promise.all( [
		db.auditLog.findMany( { ...args, select: { id: true, at: true, actorId: true, actorName: true, action: true, target: true, changes: true, ip: true } } ),
		db.auditLog.count( { where: args.where } )
	] )

	return { rows: rows.map( ( row ) => ( { ...row, at: row.at.toISOString(), changes: row.changes as AuditChanges | null } ) ), total }
}
