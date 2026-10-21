import { signUpEnabled } from '$lib/server/auth'
import type { LayoutServerLoad } from './$types'

// The public site needs no database: it works before db:setup, and on a shared
// deployment's bare domain, where there is no tenant to look up. ( The root layout's brand
// adds the workspace logo when there is one. )
export const load : LayoutServerLoad = () => ( { signUp: signUpEnabled() } )
