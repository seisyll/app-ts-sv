import { Cron } from 'croner'
import { APP } from '#lib/config.js'
import { prisma } from '#lib/server/db/index.js'
import { log, withLog } from '#lib/server/log.js'
import { withLock } from '#lib/server/redis.js'
import { JOBS, type Job } from './catalog'

/* ―― » Scheduled jobs ( the fundraiser app's scheduler, without Agenda ): each one in
        ./catalog.ts runs on its cron schedule inside the app process, in APP.timeZone. With
        several app instances only one runs a given job — it takes a Redis lock first; without
        Redis it simply runs, so keep jobs harmless to run twice. Every run is logged ( with
        `job` on its lines ) and its outcome kept in job_runs for the settings page.

        A job is deployment-wide: it goes through the workspaces with `eachTenant`, each
        under its own row-level security, never across them. */

// A job that runs longer than this loses its lock, and another instance may start it.
const LOCK_MS = 15 * 60_000

const record = ( name : string, data : { startedAt : Date, finishedAt ?: Date, ok ?: boolean, count ?: number, error ?: string } ) => {
	const row = { finishedAt: null, ok: null, count: null, error: null, ...data }

	return prisma.jobRun.upsert( { where: { name }, create: { name, ...row }, update: row } )
		.catch( ( caught ) => log.error( { err: caught }, 'couldn’t record the run' ) )
}

// One run, now: locked, logged and recorded. A failure is logged, never thrown.
export function runJob( job : Job ) : Promise<boolean> {
	return withLog( { job: job.name }, () => withLock( `jobs:${ job.name }`, LOCK_MS, async() => {
		const startedAt = new Date()

		await record( job.name, { startedAt } )

		try {
			const count = await job.run()

			await record( job.name, { startedAt, finishedAt: new Date(), ok: true, count } )
			log.info( { count, ms: Date.now() - startedAt.getTime() }, 'done' )
		} catch ( caught ) {
			await record( job.name, { startedAt, finishedAt: new Date(), ok: false, error: caught instanceof Error ? caught.message : String( caught ) } )
			log.error( { err: caught }, 'failed' )
		}
	} ) )
}

// The schedules, started once per process; started again ( a dev reload ) replaces them.
const RUNNING = Symbol.for( 'app.jobs' )

export function startJobs() : void {
	const holder = globalThis as { [ RUNNING ] ?: Cron[] }

	holder[ RUNNING ]?.forEach( ( cron ) => cron.stop() )
	holder[ RUNNING ] = JOBS.map( ( job ) => new Cron( job.schedule, { name: job.name, timezone: APP.timeZone, protect: true }, () => void runJob( job ) ) )
}

export type JobStatus = {
	name     : string
	label    : string
	schedule : string
	next     : string | null
	last     : { startedAt : string, finishedAt : string | null, ok : boolean | null, count : number | null, error : string | null } | null
}

// For the settings page: every job, when it runs next and how its last run went.
export async function jobStatus() : Promise<JobStatus[]> {
	const rows = await prisma.jobRun.findMany()

	return JOBS.map( ( job ) => {
		const row = rows.find( ( candidate ) => candidate.name === job.name )

		return {
			name    : job.name,
			label   : job.label(),
			schedule: job.schedule,
			next    : new Cron( job.schedule, { timezone: APP.timeZone, paused: true } ).nextRun()?.toISOString() ?? null,
			last    : row ? { startedAt: row.startedAt.toISOString(), finishedAt: row.finishedAt?.toISOString() ?? null, ok: row.ok, count: row.count, error: row.error } : null
		}
	} )
}
