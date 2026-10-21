import { existsSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PageQuery } from '$lib/components/data-table'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { processImage, sniff } from './media'

const bytes = ( ...values : number[] ) => new Uint8Array( [ ...values, ...new Array( 16 ).fill( 0 ) ] )
const text = ( value : string ) => new TextEncoder().encode( value )

describe( 'sniff', () => {
	it( 'knows the accepted formats by their first bytes', () => {
		expect( sniff( bytes( 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ) )?.mime ).toBe( 'image/png' )
		expect( sniff( bytes( 0xff, 0xd8, 0xff, 0xe0 ) )?.mime ).toBe( 'image/jpeg' )
		expect( sniff( text( 'GIF89a......' ) )?.mime ).toBe( 'image/gif' )
		expect( sniff( text( 'RIFF\0\0\0\0WEBPVP8 ' ) )?.mime ).toBe( 'image/webp' )
		expect( sniff( text( '\0\0\0\x1cftypavif' ) )?.mime ).toBe( 'image/avif' )
		expect( sniff( text( '%PDF-1.7\n' ) ) ).toEqual( { kind: 'document', mime: 'application/pdf' } )
	} )

	it( 'refuses text formats and anything else, whatever the name says', () => {
		expect( sniff( text( '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>' ) ) ).toBeNull()
		expect( sniff( text( '<!doctype html><script>alert(1)</script>' ) ) ).toBeNull()
		expect( sniff( text( 'PK\x03\x04' ) ) ).toBeNull()
		expect( sniff( new Uint8Array() ) ).toBeNull()
	} )
} )

describe( 'processImage', () => {
	it( 'turns a photo upright, strips its EXIF, caps its size and makes a thumbnail', async() => {
		// 3200×1600, stored sideways ( orientation 6 ) with GPS in its EXIF.
		const photo = await sharp( { create: { width: 3200, height: 1600, channels: 3, background: '#3a7' } } )
			.jpeg()
			.withExif( { IFD0: { Make: 'PhoneCo' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '6/1 10/1 0/1' } } )
			.withMetadata( { orientation: 6 } )
			.toBuffer()
		const result = await processImage( photo )
		const full = await sharp( result.full ).metadata()
		const thumb = await sharp( result.thumb ).metadata()

		expect( full.format ).toBe( 'webp' )
		// Rotated upright: portrait now, its long side capped at 2560.
		expect( [ result.width, result.height ] ).toEqual( [ 1280, 2560 ] )
		expect( full.exif ).toBeUndefined()
		expect( full.orientation ).toBeUndefined()
		expect( Math.max( thumb.width, thumb.height ) ).toBe( 480 )
	} )

	it( 'never enlarges a small image, and refuses bytes that are not one', async() => {
		const small = await sharp( { create: { width: 300, height: 200, channels: 4, background: '#0000' } } ).png().toBuffer()

		expect( await processImage( small ) ).toMatchObject( { width: 300, height: 200 } )
		await expect( processImage( new Uint8Array( [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3 ] ) ) ).rejects.toThrow()
	} )
} )

// Storage end to end: PGlite with the real migrations, files in a temp UPLOAD_ROOT.
describe( 'media storage', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let ada : string
	let root : string
	let media : typeof import( './media' )

	const query = ( kind : string ) : PageQuery => ( { skip: 0, take: 10, search: '', searchBy: 'all', filters: { kind: [ kind ] } } )
	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const inB = <T>( fn : () => Promise<T> ) => t.runWithTenant( b, fn )
	const jpeg = async( width : number, height : number ) => new File( [ await sharp( { create: { width, height, channels: 3, background: '#a73' } } ).jpeg().toBuffer() ], 'photo.jpg', { type: 'image/jpeg' } )

	beforeAll( async() => {
		root = await mkdtemp( path.join( tmpdir(), 'media-test-' ) )
		process.env.UPLOAD_ROOT = root

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
		ada = ( await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: 'ada@example.test' } } ) ).id
		await t.asApp()

		media = await import( './media' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
		await rm( root, { recursive: true, force: true } )
	} )

	it( 'stores an image as WebP with a thumbnail, in its tenant\'s folder', async() => {
		const photo = await jpeg( 800, 600 )
		const row = await inA( () => media.saveMedia( photo, ada ) )

		expect( row ).toMatchObject( { kind: 'image', name: 'photo.jpg', mime: 'image/webp', width: 800, height: 600, uploader: 'Ada', url: `/media/${ row.id }`, thumbUrl: `/media/${ row.id }/thumb` } )

		const month = row.createdAt.slice( 0, 7 ).replace( '-', path.sep )

		expect( ( await readdir( path.join( root, a.id, month ) ) ).sort() ).toEqual( [ `${ row.id }-thumb.webp`, `${ row.id }.webp` ] )
	} )

	it( 'stores a PDF as sent, and cleans the display name', async() => {
		const row = await inA( () => media.saveMedia( new File( [ '%PDF-1.4\n%%EOF' ], '../../etc/Contract\u0007.pdf' ), ada ) )

		expect( row ).toMatchObject( { kind: 'document', name: 'Contract.pdf', mime: 'application/pdf', size: 14, width: null } )
		expect( ( await inA( () => media.listMedia( query( 'document' ) ) ) ).rows.map( ( item ) => item.id ) ).toEqual( [ row.id ] )
	} )

	it( 'refuses what it can\'t sniff, what won\'t decode, and what is too big', async() => {
		await expect( inA( () => media.saveMedia( new File( [ '<svg/>' ], 'x.png', { type: 'image/png' } ), ada ) ) ).rejects.toMatchObject( { status: 415 } )
		await expect( inA( () => media.saveMedia( new File( [ new Uint8Array( [ 0xff, 0xd8, 0xff, 1, 2, 3 ] ) ], 'broken.jpg' ), ada ) ) ).rejects.toMatchObject( { status: 415 } )
		await expect( inA( () => media.saveMedia( new File( [ '%PDF-', new Uint8Array( 11 * 1024 * 1024 ) ], 'huge.pdf' ), ada ) ) ).rejects.toMatchObject( { status: 413 } )
		expect( ( await inA( () => media.listMedia( query( 'image' ) ) ) ).total ).toBe( 1 )
	} )

	it( 'serves a file only to its own tenant', async() => {
		const [ image ] = ( await inA( () => media.listMedia( query( 'image' ) ) ) ).rows

		expect( await inA( () => media.readMedia( image.id, 'thumb' ) ) ).toMatchObject( { kind: 'image', mime: 'image/webp' } )
		expect( await inB( () => media.readMedia( image.id ) ) ).toBeNull()
		expect( ( await inB( () => media.listMedia( query( 'image' ) ) ) ).total ).toBe( 0 )
		expect( await inB( () => media.deleteMedia( image.id ) ) ).toBe( false )
	} )

	it( 'serves a public file without a session, a private one only to members', async() => {
		const { GET } = await import( '../../routes/media/[id]/[[variant]]/+server' )
		const [ image ] = ( await inA( () => media.listMedia( query( 'image' ) ) ) ).rows
		const get = ( role ?: string ) => inA( async() => GET( {
			params: { id: image.id },
			locals: { session: async() => ( role ? { user: { role }, session: {} } : null ) }
		} as never ) ).then( ( response ) => response, ( caught ) => caught as { status : number } )

		expect( image.public ).toBe( false )
		expect( ( await get() ).status ).toBe( 401 )
		expect( ( await get( 'member' ) as Response ).headers.get( 'cache-control' ) ).toMatch( /^private/ )

		expect( await inB( () => media.setMediaPublic( image.id, true ) ) ).toBeNull()
		expect( await inA( () => media.setMediaPublic( image.id, true ) ) ).toMatchObject( { id: image.id, public: true } )

		const response = await get() as Response

		expect( response.status ).toBe( 200 )
		expect( response.headers.get( 'cache-control' ) ).toMatch( /^public/ )
		await response.body?.cancel()
		// Still another tenant's file for B, public or not.
		expect( await inB( () => media.readMedia( image.id ) ) ).toBeNull()
	} )

	it( 'deletes the row and its files', async() => {
		const [ image ] = ( await inA( () => media.listMedia( query( 'image' ) ) ) ).rows
		const file = path.join( root, a.id, image.createdAt.slice( 0, 7 ).replace( '-', path.sep ), `${ image.id }.webp` )

		expect( existsSync( file ) ).toBe( true )
		expect( await inA( () => media.deleteMedia( image.id ) ) ).toBe( true )
		expect( existsSync( file ) ).toBe( false )
		expect( existsSync( file.replace( '.webp', '-thumb.webp' ) ) ).toBe( false )
		expect( await inA( () => media.readMedia( image.id ) ) ).toBeNull()
	} )
} )
