import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseRichText } from '$lib/editor/document'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { defaultMailContent, MAIL_TEMPLATE_KEYS, renderMail } from './templates'

// The SMTP boundary: what would have gone to the server.
const smtp = vi.hoisted( () => ( { options: [] as unknown[], sent: [] as Record<string, unknown>[], fail: null as Error | null } ) )

vi.mock( 'nodemailer', () => ( {
	default: {
		createTransport: ( options : unknown ) => {
			smtp.options.push( options )

			return {
				sendMail: async( mail : Record<string, unknown> ) => {
					if ( smtp.fail )
						throw smtp.fail

					smtp.sent.push( mail )
				}
			}
		}
	}
} ) )

describe( 'renderMail', () => {
	const values = { name: 'Ada', workspace: 'Acme', link: 'https://acme.test/reset?token=abc' }

	it( 'fills the subject, body and text, and ends with the button and its link', () => {
		const mail = renderMail( 'password.reset', { values, baseUrl: 'https://acme.test' } )

		expect( mail.subject ).toBe( 'Reset your Acme password' )
		expect( mail.html ).toContain( 'Hi Ada,' )
		expect( mail.html ).toContain( 'href="https://acme.test/reset?token=abc"' )
		expect( mail.html ).toContain( 'Choose a new password' )
		expect( mail.text ).toContain( 'Hi Ada,' )
		expect( mail.text ).toContain( 'Choose a new password: https://acme.test/reset?token=abc' )
	} )

	it( 'escapes values in the HTML and keeps line breaks out of the subject', () => {
		const mail = renderMail( 'notification', {
			values : { ...values, title: 'Hi\r\nBcc: someone@evil.test', body: '<script>alert(1)</script>' },
			baseUrl: 'https://acme.test'
		} )

		expect( mail.subject ).toBe( 'Hi Bcc: someone@evil.test' )
		expect( mail.html ).not.toContain( '<script>' )
		expect( mail.html ).toContain( '&lt;script&gt;' )
	} )

	it( 'renders a workspace\'s own wording, leaving unknown variables as written', () => {
		const content = { subject: '{{workspace}}: {{nope}}', body: { type: 'doc' as const, content: [ { type: 'paragraph', content: [ { type: 'text', text: 'Yo ' }, { type: 'variable', attrs: { name: 'name' } } ] } ] } }
		const mail = renderMail( 'password.reset', { content, values, baseUrl: 'https://acme.test' } )

		expect( mail.subject ).toBe( 'Acme: {{nope}}' )
		expect( mail.text ).toContain( 'Yo Ada' )
		// The button is the catalog's, whatever the body says.
		expect( mail.html ).toContain( 'Choose a new password' )
	} )

	it( 'has no button without a link', () => {
		expect( renderMail( 'mail.test', { values: { workspace: 'Acme' }, baseUrl: 'https://acme.test' } ).html ).not.toContain( '<a href' )
	} )

	it.each( MAIL_TEMPLATE_KEYS )( '%s: the default body is a valid document', ( key ) => {
		expect( parseRichText( defaultMailContent( key ).body ) ).not.toBeNull()
	} )
} )

describe( 'connectableHost', () => {
	let connectableHost : typeof import( './index' ).connectableHost

	// Cold, the module graph ( Prisma, nodemailer ) can take longer than one test's timeout.
	beforeAll( async() => {
		( { connectableHost } = await import( './index' ) )
	}, 60_000 )

	afterEach( () => {
		process.env.TENANCY = 'single'
	} )

	it( 'trusts any host in single tenancy', async() => {
		expect( await connectableHost( '127.0.0.1' ) ).toBe( '127.0.0.1' )
	} )

	it.each( [ '127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fd00::1' ] )( 'refuses %s in shared tenancy', async( host ) => {
		process.env.TENANCY = 'shared'

		await expect( connectableHost( host ) ).rejects.toThrow( 'private network' )
	} )

	it( 'connects to the checked public address in shared tenancy', async() => {
		process.env.TENANCY = 'shared'

		expect( await connectableHost( '93.184.216.34' ) ).toBe( '93.184.216.34' )
	} )
} )

// Settings, wording and sending on the tenant-scoped database ( PGlite, real migrations ).
describe( 'mail', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let mail : typeof import( './index' )
	let outbox : typeof import( './outbox' )
	const ids : Record<string, string> = {}

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const inB = <T>( fn : () => Promise<T> ) => t.runWithTenant( b, fn )
	const settings = { host: 'smtp.acme.test', port: 587, security: 'starttls' as const, username: 'robot', password: 'hunter2-hunter2', fromName: 'Acme', fromEmail: 'hello@acme.test' }

	beforeAll( async() => {
		Object.assign( process.env, { BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-42', BETTER_AUTH_URL: 'http://localhost:5173', TENANCY: 'single' } )

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'Acme' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'Beta' } } )

		const media = ( tenantId : string, kind : 'image' | 'document' ) => t.prisma.media.create( { data: { tenantId, kind, name: 'x', mime: 'image/webp', size: 1 } } ).then( ( row ) => row.id )

		ids.ours = await media( a.id, 'image' )
		ids.pdf = await media( a.id, 'document' )
		ids.theirs = await media( b.id, 'image' )
		await t.asApp()
		mail = await import( './index' )
		outbox = await import( './outbox' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	afterEach( () => {
		smtp.options.length = smtp.sent.length = 0
		smtp.fail = null
		outbox.clearOutbox()
	} )

	it( 'without a mail server, dev keeps the email in the outbox only', async() => {
		await inA( () => mail.sendMail( { to: { email: 'ada@acme.test', name: 'Ada' }, template: 'password.reset', values: { link: 'https://acme.test/r' } } ) )

		expect( smtp.sent ).toEqual( [] )
		expect( outbox.listOutbox() ).toMatchObject( [ { workspace: 'Acme', to: 'ada@acme.test', subject: 'Reset your Acme password', sent: false } ] )
		expect( await inA( () => mail.mailReady() ) ).toBe( true )
	} )

	it( 'stores the password encrypted and never hands it back', async() => {
		await inA( () => mail.saveMailSettings( settings ) )

		await t.asOwner()
		const row = await t.prisma.mailSetting.findUniqueOrThrow( { where: { tenantId: a.id } } )
		await t.asApp()

		expect( row.password ).toBeTruthy()
		expect( row.password ).not.toContain( 'hunter2' )
		expect( await inA( () => mail.loadMailSettings() ) ).toEqual( { ...settings, password: undefined, hasPassword: true } )
	} )

	it( 'keeps the stored password when the form leaves it blank, and drops it with the username', async() => {
		await inA( () => mail.saveMailSettings( { ...settings, password: '', fromName: 'Acme Mail' } ) )
		expect( await inA( () => mail.loadMailSettings() ) ).toMatchObject( { fromName: 'Acme Mail', hasPassword: true } )

		await inA( () => mail.saveMailSettings( { ...settings, username: '', password: '' } ) )
		expect( await inA( () => mail.loadMailSettings() ) ).toMatchObject( { username: '', hasPassword: false } )

		await inA( () => mail.saveMailSettings( settings ) )
	} )

	it( 'keeps one workspace\'s mail server from another', async() => {
		expect( await inB( () => mail.loadMailSettings() ) ).toBeNull()
	} )

	it( 'sends through the workspace\'s server, with the password decrypted', async() => {
		await inA( () => mail.sendMail( { to: { email: 'ada@acme.test', name: 'Ada' }, template: 'mail.test' } ) )

		expect( smtp.options ).toMatchObject( [ { host: 'smtp.acme.test', port: 587, secure: false, requireTLS: true, auth: { user: 'robot', pass: 'hunter2-hunter2' } } ] )
		expect( smtp.sent ).toMatchObject( [ { from: { name: 'Acme', address: 'hello@acme.test' }, to: { name: 'Ada', address: 'ada@acme.test' }, subject: 'Test email from Acme' } ] )
		expect( outbox.listOutbox() ).toMatchObject( [ { sent: true } ] )
	} )

	it( 'passes on the server\'s refusal', async() => {
		smtp.fail = new Error( '535 Authentication failed' )

		await expect( inA( () => mail.sendMail( { to: { email: 'ada@acme.test' }, template: 'mail.test' } ) ) ).rejects.toThrow( '535' )
	} )

	it( 'uses the workspace\'s wording in the current language, until reset', async() => {
		const body = { type: 'doc' as const, content: [ { type: 'paragraph', content: [ { type: 'text', text: 'Custom words for ' }, { type: 'variable', attrs: { name: 'name' } } ] } ] }

		await inA( () => mail.saveMailTemplate( 'password.reset', { subject: 'New password for {{workspace}}', body } ) )
		expect( await inA( () => mail.customisedMailTemplates() ) ).toEqual( new Set( [ 'password.reset' ] ) )
		expect( await inB( () => mail.customisedMailTemplates() ) ).toEqual( new Set() )

		await inA( () => mail.sendMail( { to: { email: 'ada@acme.test', name: 'Ada' }, template: 'password.reset', values: { link: 'https://acme.test/r' } } ) )
		expect( smtp.sent ).toMatchObject( [ { subject: 'New password for Acme', text: expect.stringContaining( 'Custom words for Ada' ) } ] )

		await inA( () => mail.resetMailTemplate( 'password.reset' ) )
		expect( await inA( () => mail.loadMailTemplate( 'password.reset' ) ) ).toBeNull()
	} )

	it( 'refuses an image that isn\'t one of this workspace\'s, writing nothing', async() => {
		const withImage = ( src : string ) => ( { subject: 'Hi', body: { type: 'doc' as const, content: [ { type: 'paragraph', content: [ { type: 'text', text: 'Look' } ] }, { type: 'image', attrs: { src } } ] } } )
		const shared = ( fn : typeof inA ) => fn( () => t.db.media.findMany( { where: { public: true }, select: { id: true } } ) ).then( ( rows ) => rows.map( ( row ) => row.id ) )

		expect( await inA( () => mail.saveMailTemplate( 'user.invite', withImage( `/media/${ ids.theirs }` ) ) ) ).toBe( false )
		expect( await inA( () => mail.saveMailTemplate( 'user.invite', withImage( `/media/${ ids.pdf }` ) ) ) ).toBe( false )
		expect( await inA( () => mail.loadMailTemplate( 'user.invite' ) ) ).toBeNull()
		expect( await shared( inA ) ).toEqual( [] )
		expect( await shared( inB ) ).toEqual( [] )

		// Its own image ( the thumbnail too ) goes public with the wording, nobody else's file.
		expect( await inA( () => mail.saveMailTemplate( 'user.invite', withImage( `/media/${ ids.ours }/thumb` ) ) ) ).toBe( true )
		expect( await inA( () => mail.loadMailTemplate( 'user.invite' ) ) ).toMatchObject( withImage( `/media/${ ids.ours }/thumb` ) )
		expect( await shared( inA ) ).toEqual( [ ids.ours ] )
		expect( await shared( inB ) ).toEqual( [] )

		// And the email points a recipient at it on the app's origin.
		await inA( () => mail.sendMail( { to: { email: 'ada@acme.test' }, template: 'user.invite', values: { link: 'https://acme.test/r' } } ) )
		expect( smtp.sent ).toMatchObject( [ { html: expect.stringContaining( `src="http://localhost:5173/media/${ ids.ours }/thumb"` ) } ] )
	} )

	it( 'links to BETTER_AUTH_URL outside a request', async() => {
		expect( ( await import( '$lib/server/url' ) ).appUrl( '/reset-password?token=x' ) ).toBe( 'http://localhost:5173/reset-password?token=x' )
	} )
} )
