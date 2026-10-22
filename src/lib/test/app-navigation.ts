import { onDestroy, onMount } from 'svelte'
import { vi } from 'vitest'
import type { BeforeNavigate, AfterNavigate } from '$app/navigation'
import { page } from './app-state.svelte'

// Stand-in for `$app/navigation` in component tests:
//   vi.mock( '$app/navigation', () => import( '#lib/test/app-navigation.js' ) )
// Navigation functions are spies; `attemptNavigation()` runs the registered
// `beforeNavigate` guards the way SvelteKit would.

const guards = new Set<( navigation : BeforeNavigate ) => void>()

export const goto = vi.fn( async( _url : string | URL, _options ?: object ) => {} )
export const invalidate = vi.fn( async( _resource : string | URL ) => {} )
export const refreshAll = vi.fn( async() => {} )
export const preloadData = vi.fn( async() => ( { type: 'loaded', status: 200, data: {} } ) )
export const preloadCode = vi.fn( async() => {} )

export function beforeNavigate( guard : ( navigation : BeforeNavigate ) => void ) : void {
	guards.add( guard )
	onDestroy( () => guards.delete( guard ) )
}

// Like SvelteKit: runs once after mount for the initial page.
export function afterNavigate( callback : ( navigation : AfterNavigate ) => void ) : void {
	onMount( () => callback( { type: 'enter', from: null, to: null, willUnload: false, complete: Promise.resolve() } as AfterNavigate ) )
}

export function onNavigate() : void {}

export function disableScrollHandling() : void {}

type Attempt = {
	type ?      : BeforeNavigate['type']
	// Back = -1, Forward = 1 ( popstate only ).
	delta ?     : number
	willUnload ?: boolean
	// A table writing its query to the address.
	shallow ?   : boolean
}

// Simulate the user trying to leave for `to`. Returns true if a guard cancelled it.
export function attemptNavigation( to : string, { type = 'link', delta, willUnload = false, shallow = false } : Attempt = {} ) : boolean {
	let cancelled = false
	const navigation = {
		from      : { url: page.url, params: {}, route: { id: null } },
		to        : { url: new URL( to, 'http://localhost' ), params: {}, route: { id: null } },
		type,
		delta,
		willUnload,
		shallow,
		complete  : Promise.resolve(),
		cancel    : () => {
			cancelled = true
		}
	} as unknown as BeforeNavigate

	for ( const guard of guards )
		guard( navigation )

	return cancelled
}

export function resetNavigation() : void {
	for ( const spy of [ goto, invalidate, refreshAll, preloadData, preloadCode ] )
		spy.mockClear()
}
