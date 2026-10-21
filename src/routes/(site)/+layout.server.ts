import { signUpEnabled } from '$lib/server/auth'
import type { LayoutServerLoad } from './$types'

// The public site touches no database: it works before db:setup, and on a shared
// deployment's bare domain, where there is no tenant to look up.
export const load : LayoutServerLoad = () => ( { signUp: signUpEnabled() } )
