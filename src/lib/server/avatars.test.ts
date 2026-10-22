import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// Avatars as media files ( PGlite, real migrations, files in a temp UPLOAD_ROOT ).
describe( 'avatars', () => {
	let t : TestDatabase
	let avatars : typeof import( './avatars' )
	let media : typeof import( './media' )
	let root : string
	let a : TenantRef
	let ada : string

	const square = async( colour : string ) => new File( [ await sharp( { create: { width: 512, height: 512, channels: 3, background: colour } } ).webp().toBuffer() ], 'avatar.webp', { type: 'image/webp' } )
	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const row = () => inA( () => t.db.user.findUniqueOrThrow( { where: { id: ada }, select: { avatarId: true, image: true } } ) )

	beforeAll( async() => {
		root = await mkdtemp( path.join( tmpdir(), 'avatar-test-' ) )
		process.env.UPLOAD_ROOT = root
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		ada = ( await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: 'ada@a.test', image: 'https://lh3.example/ada.jpg' } } ) ).id
		await t.asApp()
		avatars = await import( './avatars' )
		media = await import( './media' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
		await rm( root, { recursive: true, force: true } )
	} )

	it( 'shows the upload, else the provider\'s picture, else nothing', () => {
		expect( avatars.avatarUrl( { avatarId: 'm1', image: 'https://x/p.jpg' } ) ).toBe( '/media/m1/thumb' )
		expect( avatars.avatarUrl( { avatarId: null, image: 'https://x/p.jpg' } ) ).toBe( 'https://x/p.jpg' )
		expect( avatars.avatarUrl( {} ) ).toBeNull()
	} )

	it( 'stores an avatar as a public media file, and replaces the last one', async() => {
		const first = await inA( async() => avatars.setAvatar( ada, await square( '#a73' ) ) )
		const firstId = ( await row() ).avatarId!
		const second = await inA( async() => avatars.setAvatar( ada, await square( '#37a' ) ) )
		const files = await inA( () => t.db.media.findMany( { select: { id: true, public: true, uploaderId: true } } ) )

		expect( [ first, second ] ).toEqual( [ `/media/${ firstId }/thumb`, `/media/${ ( await row() ).avatarId }/thumb` ] )
		expect( files ).toEqual( [ { id: ( await row() ).avatarId, public: true, uploaderId: ada } ] )
	} )

	it( 'refuses what isn\'t a picture', async() => {
		const pdf = new File( [ '%PDF-1.4\n%%EOF' ], 'avatar.pdf', { type: 'application/pdf' } )

		await expect( inA( () => avatars.setAvatar( ada, pdf ) ) ).rejects.toMatchObject( { status: 415 } )
	} )

	it( 'falls back to the provider\'s picture when the file goes, from the library or by removal', async() => {
		await inA( async() => media.deleteMedia( ( await row() ).avatarId! ) )
		expect( await row() ).toEqual( { avatarId: null, image: 'https://lh3.example/ada.jpg' } )

		await inA( async() => avatars.setAvatar( ada, await square( '#7a3' ) ) )
		expect( await inA( () => avatars.removeAvatar( ada ) ) ).toBe( true )
		expect( await inA( () => avatars.removeAvatar( ada ) ) ).toBe( false )
		expect( ( await row() ).avatarId ).toBeNull()
	} )
} )
