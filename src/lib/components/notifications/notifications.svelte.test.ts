import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import type { NotificationItem } from '#lib/notifications.js'
import NotificationBell from './NotificationBell.svelte'
import NotificationList from './NotificationList.svelte'
import { NotificationStore } from './store.svelte'

// No SvelteKit runtime in a component test: route $app/navigation to the test kit.
vi.mock( '$app/navigation', () => import( '#lib/test/app-navigation.js' ) )

const item = ( n : number, overrides : Partial<NotificationItem> = {} ) : NotificationItem => ( {
	id       : `00000000-0000-7000-8000-00000000000${ n }`,
	type     : 'user.joined',
	title    : `Person ${ n } joined the workspace`,
	body     : `person${ n }@example.test`,
	href     : '/app/users',
	readAt   : null,
	createdAt: new Date().toISOString(),
	...overrides
} )

afterEach( () => vi.restoreAllMocks() )

describe( 'NotificationList', () => {
	it( 'opens a row, or marks it done with its own check', async() => {
		const onopen = vi.fn()
		const ondismiss = vi.fn()

		await render( NotificationList, { items: [ item( 1 ), item( 2 ) ], onopen, ondismiss } )

		await page.getByRole( 'button', { name: /Person 1 joined/ } ).first().click()
		expect( onopen ).toHaveBeenCalledWith( expect.objectContaining( { id: item( 1 ).id } ) )

		await page.getByRole( 'button', { name: 'Mark “Person 2 joined the workspace” done' } ).click()
		expect( ondismiss ).toHaveBeenCalledWith( expect.objectContaining( { id: item( 2 ).id } ) )
		await expect.element( page.getByText( 'now' ).first() ).toBeInTheDocument()
	} )
} )

describe( 'NotificationBell', () => {
	it( 'shows the unread count, lists the queue, and marks all read', async() => {
		const fetch = vi.spyOn( globalThis, 'fetch' ).mockImplementation( async( input ) => new Response(
			String( input ).includes( '/read' ) ? '{"count":2}' : JSON.stringify( { items: [ item( 1 ), item( 2 ) ], unread: 2 } ),
			{ headers: { 'content-type': 'application/json' } }
		) )
		const store = new NotificationStore( { items: [ item( 1 ), item( 2 ) ], unread: 2 } )

		await render( NotificationBell, { store } )

		const bell = page.getByRole( 'button', { name: 'Notifications, 2 unread' } )

		await expect.element( bell ).toHaveTextContent( '2' )
		await bell.click()
		await expect.element( page.getByText( 'Person 2 joined the workspace' ) ).toBeInTheDocument()

		await page.getByRole( 'button', { name: 'Mark all read' } ).click()

		await expect.element( page.getByRole( 'button', { name: 'Notifications', exact: true } ) ).toBeInTheDocument()
		expect( fetch ).toHaveBeenCalledWith( expect.stringContaining( '/api/notifications/read' ), expect.objectContaining( { method: 'POST' } ) )
	} )

	it( 'tells you when there is nothing to see', async() => {
		vi.spyOn( globalThis, 'fetch' ).mockResolvedValue( new Response( '{"items":[],"unread":0}', { headers: { 'content-type': 'application/json' } } ) )

		await render( NotificationBell, { store: new NotificationStore() } )
		await page.getByRole( 'button', { name: 'Notifications' } ).click()

		await expect.element( page.getByText( 'No notifications' ) ).toBeInTheDocument()
	} )
} )
