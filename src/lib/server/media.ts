import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { error } from '@sveltejs/kit'
import sharp from 'sharp'
import type { Paged, PageQuery } from '$lib/components/data-table'
import { IMAGE_EDGE, MAX_BYTES, mediaUrl, THUMB_EDGE, type MediaKind, type MediaRow } from '$lib/media'
import { m } from '$lib/paraglide/messages'
import { currentTenant, db, tenantTransaction } from '$lib/server/db'
import { listArgs, type ListSpec } from '$lib/server/list'
import { ensureRoom } from '$lib/server/storage'

/* ―― » Uploads on disk ( from the fundraiser app's /api/upload, with billing-app's ADR 0011
        rules ). Files live at UPLOAD_ROOT/<tenant>/<yyyy>/<mm>/<id>[-thumb].<ext>:
          • named by the database id — nothing a client sends ever reaches a path;
          • read only through readMedia(), which finds the row first, so RLS decides who
            can fetch a file, exactly as it decides who can see the row;
          • typed by their magic bytes — the client's Content-Type and file name decide
            nothing. The allow-list is binary signatures, so SVG and HTML ( text ) can't
            match it: that is the XSS door closed by construction, not by a blocklist.
        Images are re-encoded by sharp: turned upright, metadata ( EXIF GPS ) stripped,
        WebP at most IMAGE_EDGE, plus a THUMB_EDGE thumbnail. PDFs are stored as sent and
        always served as downloads.

        Env: UPLOAD_ROOT ( default ./uploads ). In Docker, a writable volume.
        ponytail: no per-workspace quota, no streaming uploads, no image variants beyond the
        thumbnail; the fundraiser app's StorageUsage is the model for a quota. */

export const uploadRoot = () => path.resolve( process.env.UPLOAD_ROOT || 'uploads' )

type Sniffed = { kind : MediaKind, mime : string }

const startsWith = ( bytes : Uint8Array, signature : number[], offset = 0 ) => signature.every( ( byte, index ) => bytes[ offset + index ] === byte )
const ascii = ( text : string ) => [ ...text ].map( ( char ) => char.charCodeAt( 0 ) )

// The few formats accepted, by their first bytes.
export function sniff( bytes : Uint8Array ) : Sniffed | null {
	if ( startsWith( bytes, [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ] ) )
		return { kind: 'image', mime: 'image/png' }
	if ( startsWith( bytes, [ 0xff, 0xd8, 0xff ] ) )
		return { kind: 'image', mime: 'image/jpeg' }
	if ( startsWith( bytes, ascii( 'GIF87a' ) ) || startsWith( bytes, ascii( 'GIF89a' ) ) )
		return { kind: 'image', mime: 'image/gif' }
	if ( startsWith( bytes, ascii( 'RIFF' ) ) && startsWith( bytes, ascii( 'WEBP' ), 8 ) )
		return { kind: 'image', mime: 'image/webp' }
	if ( startsWith( bytes, ascii( 'ftypavif' ), 4 ) || startsWith( bytes, ascii( 'ftypavis' ), 4 ) )
		return { kind: 'image', mime: 'image/avif' }
	if ( startsWith( bytes, ascii( '%PDF-' ) ) )
		return { kind: 'document', mime: 'application/pdf' }

	return null
}

// A decode ceiling: a small file that unpacks to a huge bitmap ( a "pixel flood" ) is refused.
const MAX_PIXELS = 50_000_000

export type ProcessedImage = { full : Buffer, thumb : Buffer, width : number, height : number }

// Upright ( EXIF orientation applied ), no metadata ( sharp writes none unless asked ), WebP.
// An animated GIF keeps its first frame.
export async function processImage( bytes : Uint8Array ) : Promise<ProcessedImage> {
	const source = sharp( bytes, { limitInputPixels: MAX_PIXELS, failOn: 'error' } ).rotate()
	const full = await source.clone().resize( IMAGE_EDGE, IMAGE_EDGE, { fit: 'inside', withoutEnlargement: true } ).webp( { quality: 85 } ).toBuffer( { resolveWithObject: true } )
	const thumb = await source.clone().resize( THUMB_EDGE, THUMB_EDGE, { fit: 'inside', withoutEnlargement: true } ).webp( { quality: 75 } ).toBuffer()

	return { full: full.data, thumb, width: full.info.width, height: full.info.height }
}

const EXTENSION : Record<string, string> = { 'image/webp': 'webp', 'application/pdf': 'pdf' }

// Where a file lives. `id` is a database uuid, checked again here so nothing else can.
export function mediaPath( tenantId : string, id : string, createdAt : Date, mime : string, variant ?: 'thumb' ) : string {
	if ( !/^[0-9a-f-]{36}$/.test( id ) || !/^[0-9a-f-]{36}$/.test( tenantId ) )
		throw new Error( 'mediaPath: not a uuid' )

	const month = createdAt.toISOString().slice( 0, 7 ).replace( '-', path.sep )

	return path.join( uploadRoot(), tenantId, month, `${ id }${ variant ? `-${ variant }` : '' }.${ EXTENSION[ mime ] ?? 'bin' }` )
}

// Display names only: no directories, no control characters, a sane length.
const cleanName = ( name : string ) => name.split( /[\\/]/ ).pop()!.replace( /[\u0000-\u001f\u007f]/g, '' ).trim().slice( 0, 200 ) || 'file'

const SELECT = { id: true, kind: true, name: true, mime: true, size: true, width: true, height: true, public: true, createdAt: true, uploader: { select: { name: true } } } as const

type Selected = { id : string, kind : MediaKind, name : string, mime : string, size : number, width : number | null, height : number | null, public : boolean, createdAt : Date, uploader : { name : string } | null }

const toRow = ( media : Selected ) : MediaRow => ( {
	...media,
	createdAt: media.createdAt.toISOString(),
	uploader : media.uploader?.name ?? null,
	url      : mediaUrl( media.id ),
	thumbUrl : media.kind === 'image' ? mediaUrl( media.id, 'thumb' ) : mediaUrl( media.id )
} )

/* ―― » Store one upload. The row and the files go together: the row is written inside a
        transaction that also writes the files, so a failed write leaves no row pointing at
        nothing. A crash between the files and COMMIT can leave files without a row —
        invisible, and harmless beyond the disk they take. */
export async function saveMedia( file : File, uploaderId : string ) : Promise<MediaRow> {
	const bytes = new Uint8Array( await file.arrayBuffer() )
	const sniffed = sniff( bytes )

	if ( !sniffed )
		error( 415, m.media_unsupported( { name: file.name } ) )

	if ( bytes.byteLength > MAX_BYTES[ sniffed.kind ] )
		error( 413, m.media_too_large( { name: file.name } ) )

	const image = sniffed.kind === 'image'
		? await processImage( bytes ).catch( () => error( 415, m.media_unreadable( { name: file.name } ) ) )
		: undefined
	const stored = image?.full ?? bytes
	const mime = image ? 'image/webp' : sniffed.mime
	const { id: tenantId } = await currentTenant()

	// Measured as stored: a photo that shrank to WebP counts as what it became.
	await ensureRoom( file.name, stored.byteLength )

	const media = await tenantTransaction( async( tx ) => {
		const row = await tx.media.create( {
			data  : { kind: sniffed.kind, name: cleanName( file.name ), mime, size: stored.byteLength, width: image?.width, height: image?.height, uploaderId },
			select: SELECT
		} )
		const full = mediaPath( tenantId, row.id, row.createdAt, mime )

		await mkdir( path.dirname( full ), { recursive: true } )
		await writeFile( full, stored )

		if ( image )
			await writeFile( mediaPath( tenantId, row.id, row.createdAt, mime, 'thumb' ), image.thumb )

		return row
	} )

	return toRow( media )
}

const LIST : ListSpec = {
	search     : [ 'name' ],
	facets     : { kind: ( values ) => ( { kind: { in: values } } ) },
	sort       : [ 'createdAt', 'name', 'size' ],
	defaultSort: { createdAt: 'desc' },
	date       : 'createdAt'
}

export async function listMedia( query : PageQuery ) : Promise<Paged<MediaRow>> {
	const args = listArgs( query, LIST )
	const [ rows, total ] = await Promise.all( [
		db.media.findMany( { ...args, select: SELECT } ),
		db.media.count( { where: args.where } )
	] )

	return { rows: rows.map( toRow ), total }
}

// A file to send, or null when this tenant has no such media ( RLS hides other tenants' ).
// Whether the caller may have it is the route's call: `public`, or a member's session.
export async function readMedia( id : string, variant ?: 'thumb' ) {
	const media = await db.media.findUnique( { where: { id }, select: { tenantId: true, kind: true, name: true, mime: true, public: true, createdAt: true } } )

	if ( !media || ( variant && media.kind !== 'image' ) )
		return null

	const file = mediaPath( media.tenantId, id, media.createdAt, media.mime, variant )
	// A row whose file is gone ( a lost volume ) answers like a missing one, not a broken stream.
	const size = await stat( file ).then( ( info ) => info.size, () => null )

	if ( size === null )
		return null

	return { ...media, size, body: () => Readable.toWeb( createReadStream( file ) ) as ReadableStream }
}

// Public or private again. Null when this tenant has no such media.
export async function setMediaPublic( id : string, value : boolean ) : Promise<MediaRow | null> {
	if ( !await db.media.findUnique( { where: { id }, select: { id: true } } ) )
		return null

	return toRow( await db.media.update( { where: { id }, data: { public: value }, select: SELECT } ) )
}

// The row first ( RLS: only this tenant's ), then its files. A file that fails to go is
// left behind rather than resurrecting the row. Answers the file's name, or null when this
// tenant has no such media.
export async function deleteMedia( id : string ) : Promise<string | null> {
	const media = await db.media.findUnique( { where: { id }, select: { tenantId: true, kind: true, name: true, mime: true, createdAt: true } } )

	if ( !media )
		return null

	await db.media.delete( { where: { id } } )

	const files = [ mediaPath( media.tenantId, id, media.createdAt, media.mime ), ...( media.kind === 'image' ? [ mediaPath( media.tenantId, id, media.createdAt, media.mime, 'thumb' ) ] : [] ) ]

	await Promise.all( files.map( ( file ) => rm( file, { force: true } ) ) )

	return media.name
}
