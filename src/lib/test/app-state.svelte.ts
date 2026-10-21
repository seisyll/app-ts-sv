// Stand-in for `$app/state` in component tests — there is no SvelteKit runtime there:
//   vi.mock( '$app/state', () => import( '$lib/test/app-state.svelte' ) )
// It is reactive: change `page` / `navigating` in a test and components update.
export const page = $state( {
	url   : new URL( 'http://localhost/' ),
	params: {} as Record<string, string>,
	route : { id: null as string | null },
	data  : {} as Record<string, unknown>,
	state : {} as Record<string, unknown>,
	form  : null as unknown,
	status: 200,
	error : null as App.Error | null
} )

export const navigating = $state<{ to : { url : URL } | null }>( { to: null } )

export const updated = { current: false, check: async() => false }

export function setPath( path : string ) : void {
	page.url = new URL( path, 'http://localhost' )
}

// Show a navigation as in flight ( drives NavProgress / isPending ); null ends it.
export function setNavigating( path : string | null ) : void {
	navigating.to = path === null ? null : { url: new URL( path, 'http://localhost' ) }
}
