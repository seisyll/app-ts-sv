import { m } from '$lib/paraglide/messages'
import { db, eachTenant } from '$lib/server/db'
import { purgeSignIns } from '$lib/server/sign-ins'

export type Job = {
	// Unique, stable: its lock and its row in job_runs.
	name     : string
	label    : () => string
	// Cron in APP.timeZone — minute hour day month weekday. Off the hour, so jobs across
	// deployments don't all start at once.
	schedule : string
	// Does the work; answers how many rows it dealt with.
	run      : () => Promise<number>
}

/* ―― » The jobs this build runs. A module's job is listed under its MODULES guard, so a
        build without the module has neither the job nor its code. Adding one: an entry
        here, its job_* message, and work that is safe to run twice. */
export const JOBS : Job[] = [
	// Sessions and one-time tokens ( resets, invites, verifications ) past their expiry:
	// better-auth refuses them already, this only stops them piling up.
	{
		name    : 'auth.expired',
		label   : m.job_auth_expired,
		schedule: '43 * * * *',
		run     : () => eachTenant( async() => {
			const now = new Date()
			const [ sessions, tokens ] = await Promise.all( [
				db.session.deleteMany( { where: { expiresAt: { lt: now } } } ),
				db.verification.deleteMany( { where: { expiresAt: { lt: now } } } )
			] )

			return sessions.count + tokens.count
		} )
	},
	...( MODULES.signins ? [ {
		name    : 'signins.purge',
		label   : m.job_signins_purge,
		schedule: '17 3 * * *',
		run     : () => eachTenant( () => purgeSignIns() )
	} ] : [] )
]
