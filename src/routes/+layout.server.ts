import { loadBrand } from '#lib/server/brand.js'
import type { LayoutServerLoad } from './$types'

// The workspace's name, logo and favicon for every page's chrome; null without a database
// or a tenant ( see loadBrand ). No dependencies: a client-side navigation doesn't re-run
// it, a save that calls refreshAll does.
export const load : LayoutServerLoad = async( { locals } ) => ( { brand: await loadBrand( locals.tenant ) } )
