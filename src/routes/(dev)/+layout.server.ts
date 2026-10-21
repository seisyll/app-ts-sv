import { dev } from '$app/environment'
import { error } from '@sveltejs/kit'
import { parseAppearance } from '$lib/appearance'
import { APPEARANCE_COOKIE } from '$lib/server/appearance'
import type { LayoutServerLoad } from './$types'

// Playground only: every page under (dev) 404s outside `vite dev`. The look on screen ( the
// appearance cookie ) seeds the playground's picker, which only paints — no database here.
export const load : LayoutServerLoad = ( { cookies } ) => {
	if ( !dev ) error( 404 )

	return { appearance: parseAppearance( cookies.get( APPEARANCE_COOKIE ) ) }
}
