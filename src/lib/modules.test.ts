import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { definePreset } from '#config/define.js'
import { MODULE_IDS, moduleDefinition, routeOwner, withRequirements, type ModuleId } from '#config/modules.js'
import { full } from '#config/presets/full.js'
import { resolveClient } from '#config/resolve.js'
import { modules, routeStub } from '#config/vite.js'
import { runWithTenant, type TenantRef } from '#lib/server/db/index.js'

const THEMES = [ 'aurora', 'plain' ]

describe( 'the registry', () => {
	it( 'requires only modules it has', () => {
		for ( const id of MODULE_IDS )
			expect( MODULE_IDS ).toEqual( expect.arrayContaining( [ ...moduleDefinition( id ).requires ?? [] ] ) )
	} )

	it( 'lists every route once', () => {
		const routes = MODULE_IDS.flatMap( ( id ) => moduleDefinition( id ).routes )

		expect( new Set( routes ).size ).toBe( routes.length )
		expect( routes.every( ( route ) => route.startsWith( '/' ) && !route.endsWith( '/' ) ) ).toBe( true )
	} )

	it.each( [
		[ '/app/media', 'media' ],
		[ '/media/[id]/[[variant]]', 'media' ],
		[ '/(auth)/reset-password', 'mail' ],
		[ '/(site)', 'site' ],
		[ '/(dev)/hello/notifications', 'notifications' ],
		[ '/app/settings', undefined ],
		[ '/app/mediathek', undefined ],
		[ null, undefined ]
	] )( 'knows who owns %s', ( routeId, owner ) => {
		expect( routeOwner( routeId ) ).toBe( owner )
	} )

	it( 'drops a module whose requirement is missing', () => {
		expect( withRequirements( [ 'mail', 'media' ] ) ).toEqual( new Set( [ 'media' ] ) )
		expect( withRequirements( [ 'mail', 'editor' ] ) ).toEqual( new Set( [ 'mail', 'editor' ] ) )
	} )
} )

describe( 'resolveClient', () => {
	it( 'applies presets in order, then the client, and leaves the rest off', () => {
		const media = definePreset( { modules: { media: true, users: true }, theme: 'plain' } )
		const client = resolveClient( 'acme', { extends: [ full, media ], modules: { users: false } }, THEMES )

		expect( client ).toMatchObject( { name: 'acme', theme: 'plain', modules: { media: true, users: false, site: true } } )
		expect( resolveClient( 'bare', {}, THEMES ).modules ).toEqual( Object.fromEntries( MODULE_IDS.map( ( id ) => [ id, false ] ) ) )
	} )

	it( 'refuses an unknown module, a missing requirement and a theme that isn\'t there, all at once', () => {
		expect( () => resolveClient( 'acme', { modules: { mail: true, chat: true } as unknown as Record<ModuleId, boolean>, theme: 'neon' }, THEMES ) )
			.toThrow( /unknown module "chat".*mail needs editor/ )
		expect( () => resolveClient( 'acme', { modules: { site: true }, theme: 'neon' }, THEMES ) ).toThrow( 'theme "neon"' )
	} )

	it( 'doesn\'t care about the theme without the public site', () => {
		expect( resolveClient( 'acme', { modules: { users: true }, theme: 'neon' }, THEMES ).modules.site ).toBe( false )
	} )
} )

describe( 'routeStub', () => {
	it( 'turns pages, layouts and endpoints into 404s, components into nothing', () => {
		expect( routeStub( '/x/src/routes/app/media/+page.svelte' ) ).toBe( '' )
		expect( routeStub( '/x/src/routes/app/media/+page.server.ts' ) ).toContain( 'export const load = off' )
		expect( routeStub( '/x/src/routes/api/media/+server.ts' ) ).toMatch( /error\( 404 \)[\s\S]*export const POST = off/ )
		expect( routeStub( '/x/src/routes/app/media/columns.ts' ) ).toBe( 'export {}' )
	} )

	it( 'sends people to whenOff instead', () => {
		expect( routeStub( '/x/src/routes/(site)/+layout.server.ts', '/app' ) ).toContain( 'redirect( 307, "/app" )' )
	} )

	// The site's pages are the editor's too: a site-only build must carry no TipTap.
	it( 'stubs a route inside another module\'s unless the build has both', () => {
		const load = ( on : Partial<Record<ModuleId, boolean>>, file : string ) =>
			( modules( resolveClient( 'acme', { modules: on }, THEMES ) ).load as unknown as ( id : string ) => string | undefined )( path.resolve( 'src/routes', file ) )

		expect( load( { site: true }, '(site)/[page=site_page]/+page.server.ts' ) ).toContain( 'error( 404 )' )
		expect( load( { site: true }, '(site)/+layout.server.ts' ) ).toBeUndefined()
		expect( load( { site: true, editor: true }, '(site)/[page=site_page]/+page.server.ts' ) ).toBeUndefined()
	} )
} )

// No database needed: the tenant ref carries what's off.
describe( 'the workspace\'s modules', () => {
	const tenant = ( modulesOff : string[] ) : TenantRef => ( { id: 't', slug: 't', name: 'T', modulesOff } )

	it( 'are the build\'s, minus what the workspace switched off and what needs it', async() => {
		const { activeModules } = await import( '#lib/server/modules.js' )

		expect( await runWithTenant( tenant( [] ), activeModules ) ).toEqual( MODULE_IDS )
		expect( await runWithTenant( tenant( [ 'editor', 'site' ] ), activeModules ) ).toEqual( MODULE_IDS.filter( ( id ) => ![ 'editor', 'mail', 'site' ].includes( id ) ) )
	} )

	it( 'close a module\'s routes for a workspace that switched it off: 404, or its whenOff', async() => {
		const { handleModules } = await import( '#lib/server/modules.js' )
		const resolve = vi.fn( async() => new Response( 'ok' ) )
		const request = ( id : string, off : string[] ) => runWithTenant( tenant( off ), () => handleModules( { event: { route: { id } }, resolve } as never ) )

		await expect( request( '/app/media', [ 'media' ] ) ).rejects.toMatchObject( { status: 404 } )
		await expect( request( '/(site)', [ 'site' ] ) ).rejects.toMatchObject( { status: 307, location: '/app' } )
		// The playground goes by the build alone.
		expect( await ( await request( '/(dev)/hello/media', [ 'media' ] ) ).text() ).toBe( 'ok' )
		expect( await ( await request( '/app/media', [] ) ).text() ).toBe( 'ok' )
		expect( resolve ).toHaveBeenCalledTimes( 2 )
	} )
} )
