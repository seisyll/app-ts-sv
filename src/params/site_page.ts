import { isSitePage, type SitePageKey } from '$lib/site'

// /privacy, /terms, /about … — the keys of SITE_PAGES, and nothing else at the site's root.
export const match = ( param : string ) : param is SitePageKey => isSitePage( param )
