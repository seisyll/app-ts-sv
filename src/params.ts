import { defineParams } from '@sveltejs/kit/params'
// By its real name, not site.js: the build checks the matchers by importing this file in Node,
// which doesn't map .js to .ts the way Vite and TypeScript do.
import { isSitePage } from '#lib/site.ts'

export const params = defineParams( {
	// /privacy, /terms, /about … — the keys of SITE_PAGES, and nothing else at the site's root.
	site_page: ( param ) => isSitePage( param ) ? param : undefined
} )
