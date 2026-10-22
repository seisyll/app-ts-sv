import { helpList } from '#lib/server/help.js'
import type { PageServerLoad } from './$types'

// Everything this workspace can read; an article opens over the page ( ?help=<id> ).
export const load : PageServerLoad = async() => ( { articles: await helpList() } )
