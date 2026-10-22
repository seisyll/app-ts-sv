import { marked } from 'marked'
import { helpAvailable, helpEntry, HELP_ARTICLES, type HelpCategory } from '#lib/help/index.js'
import { baseLocale, getLocale } from '#lib/paraglide/runtime.js'
import { activeModules } from '#lib/server/modules.js'

// Every article in every language, read at build time ( the text stays on the server ).
const FILES = import.meta.glob<string>( '/src/lib/help/content/*/*.md', { query: '?raw', import: 'default', eager: true } )

type Article = { id : string, title : string, summary : string, markdown : string }

function read( id : string, locale : string ) : Article | null {
	const raw = FILES[ `/src/lib/help/content/${ locale }/${ id }.md` ] ?? FILES[ `/src/lib/help/content/${ baseLocale }/${ id }.md` ]

	if ( !raw )
		return null

	const [ first, ...rest ] = raw.replace( /\r\n/g, '\n' ).trim().split( '\n' )
	const markdown = rest.join( '\n' ).trim()
	// The opening paragraph, as plain text, for the list.
	const lead = marked.lexer( markdown ).find( ( token ) => token.type === 'paragraph' )

	return {
		id,
		title  : first.replace( /^#\s*/, '' ),
		summary: lead && 'text' in lead ? lead.text.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' ).replace( /[*_`]/g, '' ) : '',
		markdown
	}
}

export type HelpListItem = { id : string, category : HelpCategory, title : string, summary : string }

// The articles this workspace can read, in the reader's language.
export async function helpList() : Promise<HelpListItem[]> {
	const active = await activeModules()

	return HELP_ARTICLES.filter( ( entry ) => helpAvailable( entry, active ) ).flatMap( ( entry ) => {
		const article = read( entry.id, getLocale() )

		return article ? [ { id: entry.id, category: entry.category, title: article.title, summary: article.summary } ] : []
	} )
}

// One article as HTML, or null when it isn't there for this workspace. The Markdown is ours
// ( it ships with the app ), not a visitor's, so its HTML is trusted.
export async function helpArticle( id : string ) : Promise<{ id : string, title : string, html : string } | null> {
	if ( !helpAvailable( helpEntry( id ), await activeModules() ) )
		return null

	const article = read( id, getLocale() )

	return article && { id, title: article.title, html: await marked.parse( article.markdown ) }
}
