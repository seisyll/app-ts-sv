import { dev } from '$app/environment'
import { error } from '@sveltejs/kit'

// Playground only: every page under (dev) 404s outside `vite dev`.
export const load = () => {
	if ( !dev ) error( 404 )
}
