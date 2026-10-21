import type { Paged, PageQuery } from '$lib/components/data-table'
import { log } from '$lib/server/log'
import type { SignInMethod, SignInOutcome, SignInRow } from '$lib/sign-ins'
import { lastDays } from '$lib/months'
import { db } from '$lib/server/db'
import { listArgs, type ListSpec } from '$lib/server/list'
import { moduleActive } from '$lib/server/modules'

/* ―― » The sign-in log ( billing-app's login log ): every attempt, written by the sign-in
        guard ( password: src/lib/server/sign-in-guard.ts ) and better-auth's session hook
        ( providers: src/lib/server/auth.ts ). Like the audit trail, a failure to record
        never fails the sign-in. Kept 90 days: the scheduler purges older entries.
        ponytail: no purge until the scheduler lands; the table grows until then. */

export type SignInAttempt = {
	email      : string
	outcome    : SignInOutcome
	method     : SignInMethod
	userId ?   : string | null
	ip ?       : string | null
	userAgent ?: string | null
}

export async function recordSignIn( attempt : SignInAttempt ) : Promise<void> {
	if ( !MODULES.signins )
		return

	try {
		if ( !await moduleActive( 'signins' ) )
			return

		const email = attempt.email.trim().toLowerCase()
		// The account the email belongs to, so its owner sees attempts on it.
		const userId = attempt.userId ?? ( email ? ( await db.user.findFirst( { where: { email }, select: { id: true } } ) )?.id : null ) ?? null

		await db.signInEvent.create( { data: { email, userId, outcome: attempt.outcome, method: attempt.method, ip: attempt.ip ?? null, userAgent: attempt.userAgent?.slice( 0, 400 ) ?? null } } )
	} catch ( caught ) {
		log.error( { err: caught, scope: 'sign-ins' }, "couldn't record an attempt" )
	}
}

const SELECT = { id: true, at: true, userId: true, email: true, outcome: true, method: true, ip: true, userAgent: true, user: { select: { name: true } } } as const

const toRow = ( row : { at : Date, user : { name : string } | null } & Omit<SignInRow, 'at' | 'name'> ) : SignInRow => ( { ...row, at: row.at.toISOString(), name: row.user?.name ?? null } )

const LIST : ListSpec = {
	search     : [ 'email', 'ip' ],
	facets     : {
		outcome: ( values ) => ( { outcome: { in: values } } ),
		method : ( values ) => ( { method: { in: values } } )
	},
	sort       : [ 'at', 'email', 'outcome' ],
	defaultSort: { at: 'desc' },
	date       : 'at'
}

export async function listSignIns( query : PageQuery ) : Promise<Paged<SignInRow>> {
	const args = listArgs( query, LIST )
	const [ rows, total ] = await Promise.all( [
		db.signInEvent.findMany( { ...args, select: SELECT } ),
		db.signInEvent.count( { where: args.where } )
	] )

	return { rows: rows.map( toRow ), total }
}

// One person's latest attempts ( their own Password page ).
export async function mySignIns( userId : string, take = 10 ) : Promise<SignInRow[]> {
	return ( await db.signInEvent.findMany( { where: { userId }, orderBy: { at: 'desc' }, take, select: SELECT } ) ).map( toRow )
}

// The admin page's figures: the last 24 hours, and successes vs refusals per day for 14 days.
export async function signInStats( now = new Date() ) {
	const since = new Date( now.getTime() - 86_400_000 )
	const days = lastDays( 14, now )
	const [ ok, refused, addresses, daily ] = await Promise.all( [
		db.signInEvent.count( { where: { at: { gte: since }, outcome: 'success' } } ),
		db.signInEvent.count( { where: { at: { gte: since }, outcome: { not: 'success' } } } ),
		db.signInEvent.groupBy( { by: [ 'ip' ], where: { at: { gte: since }, outcome: { not: 'success' } } } ),
		Promise.all( days.map( async( day ) => {
			const [ success, failed ] = await Promise.all( [
				db.signInEvent.count( { where: { at: { gte: day.start, lt: day.end }, outcome: 'success' } } ),
				db.signInEvent.count( { where: { at: { gte: day.start, lt: day.end }, outcome: { not: 'success' } } } )
			] )

			return { day: day.key, success, failed }
		} ) )
	] )

	return { ok, refused, addresses: addresses.length, daily }
}

// How long attempts are kept. The scheduler's signins.purge removes older ones, workspace by
// workspace ( src/lib/server/jobs ).
export const SIGN_IN_RETENTION_DAYS = 90

export async function purgeSignIns( now = new Date() ) : Promise<number> {
	const before = new Date( now.getTime() - SIGN_IN_RETENTION_DAYS * 86_400_000 )

	return ( await db.signInEvent.deleteMany( { where: { at: { lt: before } } } ) ).count
}
