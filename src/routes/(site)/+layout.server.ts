import { signUpEnabled } from '#lib/server/auth.js'
import { loadPublicSite } from '#lib/server/site.js'
import type { LayoutServerLoad } from './$types'

// The public site needs no database: it works before db:setup, and on a shared
// deployment's bare domain, where there is no tenant to look up. ( The root layout's brand
// adds the workspace logo when there is one; `site` its footer details and pages, or null. )
export const load : LayoutServerLoad = async() => ( { signUp: signUpEnabled(), site: await loadPublicSite() } )
