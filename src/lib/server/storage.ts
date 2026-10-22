import { error } from '@sveltejs/kit'
import { parseBytes } from '#lib/bytes.js'
import { formatBytes } from '#lib/media.js'
import { m } from '#lib/paraglide/messages.js'
import { currentTenant, db, prisma } from '#lib/server/db/index.js'

/* ―― » How much a workspace may store ( the fundraiser app's storage usage, made per
        workspace: A measured pg_database_size, which under shared tenancy is everyone's ).
        Usage is the media library's stored files — what each upload became on disk, its
        thumbnail aside. The limit is the workspace's own ( tenants.storage_quota, set with
        `bun run tenant:quota` ), else the deployment's STORAGE_QUOTA, else none.
        ponytail: checked before each upload, not locked — uploads racing each other can pass
        the limit by a file each; a lock per workspace if that ever matters. */
export type StorageUsage = { used : number, quota : number | null }

export async function storageUsage() : Promise<StorageUsage> {
	const { id } = await currentTenant()
	const [ sum, tenant ] = await Promise.all( [
		db.media.aggregate( { _sum: { size: true } } ),
		prisma.tenant.findUnique( { where: { id }, select: { storageQuota: true } } )
	] )
	const own = tenant?.storageQuota

	return {
		used : sum._sum.size ?? 0,
		quota: own === null || own === undefined ? parseBytes( process.env.STORAGE_QUOTA ) : own === 0n ? null : Number( own )
	}
}

// Refuses ( 413 ) a file of `bytes` that wouldn't fit, naming it and what's left.
export async function ensureRoom( name : string, bytes : number ) : Promise<void> {
	const { used, quota } = await storageUsage()

	if ( quota !== null && used + bytes > quota )
		error( 413, m.media_quota_full( { name, used: formatBytes( used ), quota: formatBytes( quota ) } ) )
}
