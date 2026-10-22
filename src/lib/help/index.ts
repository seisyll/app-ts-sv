import type { ReadonlyURL } from '$app/state'
import type { ModuleId } from '#lib/modules.js'
import { m } from '#lib/paraglide/messages.js'

/* ―― » The help centre's articles ( the fundraiser app's Pusat Bantuan, in Markdown ). Each
        is a file per language, content/<locale>/<id>.md, whose first line is its "# Title";
        a language without it falls back to English. Only this list reaches the browser — the
        text is rendered on the server ( src/lib/server/help.ts ) and fetched when opened.

        `module`: the article is about that module, so it's hidden where the module is off
        ( in this build, or for this workspace ). Adding one: a file in each language and an
        entry here. */
export const HELP_CATEGORIES = {
	people  : m.help_category_people,
	settings: m.help_category_settings,
	security: m.help_category_security
} as const

export type HelpCategory = keyof typeof HELP_CATEGORIES

export type HelpEntry = { id : string, category : HelpCategory, module ?: ModuleId }

export const HELP_ARTICLES : readonly HelpEntry[] = [
	{ id: 'invite-people', category: 'people', module: 'users' },
	{ id: 'email-setup', category: 'settings', module: 'mail' },
	{ id: 'sign-in-protection', category: 'security', module: 'captcha' }
]

// Built, and on where we are ( `active`: the workspace's modules; omitted, the build's ).
export const helpAvailable = ( entry : HelpEntry | undefined, active ?: readonly string[] ) : entry is HelpEntry =>
	!!entry && ( !entry.module || ( active ? active.includes( entry.module ) : true ) )

export const helpEntry = ( id : string ) => HELP_ARTICLES.find( ( entry ) => entry.id === id )

// The current page with the article open over it ( ?help=<id> ): shareable, and what
// HelpLink points at.
export function helpHref( url : ReadonlyURL, id : string | null ) : string {
	const next = new URL( url.href )

	if ( id )
		next.searchParams.set( 'help', id )
	else
		next.searchParams.delete( 'help' )

	return `${ next.pathname }${ next.search }${ next.hash }`
}
