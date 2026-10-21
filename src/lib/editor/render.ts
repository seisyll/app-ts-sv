import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import { richTextExtensions, type RichText } from './schema'

/* ―― » Rich text out, from a document that passed parseRichText(). Pure functions — run them
        in a load, on the server, so the HTML is in the first render:
          renderRichText( doc )                           → HTML for the app ( <RichText /> )
          renderEmailHTML( doc, { baseUrl, values } )     → HTML for an email body
        Text and attribute values are escaped by the renderer; URLs were vetted on save. */

export const renderRichText = ( doc : RichText ) : string => renderToHTMLString( { content: doc, extensions: richTextExtensions } )

const escape = ( text : string ) => text.replace( /[&<>"']/g, ( char ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' } )[ char ]! )
const join = ( children : unknown ) => ( Array.isArray( children ) ? children.join( '' ) : String( children ?? '' ) )
const align = ( node : ProseMirrorNode ) => ( node.attrs.textAlign && node.attrs.textAlign !== 'left' ? `text-align:${ node.attrs.textAlign };` : '' )

type EmailOptions = {
	// Origin that turns /media/… and other app paths absolute. Mail clients need full URLs —
	// and images a recipient can load without signing in ( see the README ).
	baseUrl : string
	// What each {{variable}} becomes; one left out stays as {{name}}. Escaped.
	values ?: Record<string, string>
}

/* ―― » Email clients read neither classes nor CSS variables, so every element carries its own
        inline style — which is why the colours here are literal: an email has no theme.
        Margins are explicit ( clients' defaults differ ), images are blocks at most 100% wide. */
export function renderEmailHTML( doc : RichText, { baseUrl, values = {} } : EmailOptions ) : string {
	const absolute = ( url : string ) => ( url.startsWith( '/' ) ? `${ baseUrl.replace( /\/$/, '' ) }${ url }` : url )
	const block = ( tag : string, style : string ) => ( { node, children } : { node : ProseMirrorNode, children ?: unknown } ) => `<${ tag } style="${ style }${ align( node ) }">${ join( children ) }</${ tag }>`

	const body = renderToHTMLString( {
		content   : doc,
		extensions: richTextExtensions,
		options   : {
			nodeMapping: {
				paragraph: ( { node, parent, children } ) => {
					const inner = join( children )

					return `<p style="margin:${ parent?.type.name === 'listItem' ? '0' : '0 0 16px' };${ align( node ) }">${ inner || '<br>' }</p>`
				},
				heading: ( { node, children } ) => {
					const size = { 1: 28, 2: 22, 3: 18 }[ node.attrs.level as 1 | 2 | 3 ] ?? 18

					return `<h${ node.attrs.level } style="margin:24px 0 12px;font-size:${ size }px;line-height:1.3;font-weight:700;${ align( node ) }">${ join( children ) }</h${ node.attrs.level }>`
				},
				bulletList    : block( 'ul', 'margin:0 0 16px;padding-left:24px;' ),
				orderedList   : ( { node, children } ) => `<ol start="${ Number( node.attrs.start ) || 1 }" style="margin:0 0 16px;padding-left:24px;">${ join( children ) }</ol>`,
				listItem      : block( 'li', 'margin:0 0 4px;' ),
				blockquote    : block( 'blockquote', 'margin:0 0 16px;padding:0 0 0 16px;border-left:3px solid #d1d5db;color:#4b5563;' ),
				codeBlock     : block( 'pre', 'margin:0 0 16px;padding:12px;background:#f3f4f6;border-radius:6px;font-family:Menlo,Consolas,monospace;font-size:14px;white-space:pre-wrap;' ),
				horizontalRule: () => '<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">',
				hardBreak     : () => '<br>',
				image         : ( { node } ) => {
					const margin = { left: '0 auto 16px 0', right: '0 0 16px auto' }[ node.attrs.align as string ] ?? '0 auto 16px'
					const width = Number( node.attrs.width ) || undefined

					return `<img src="${ escape( absolute( node.attrs.src ) ) }" alt="${ escape( node.attrs.alt ?? '' ) }"${ width ? ` width="${ width }"` : '' } style="display:block;max-width:100%;height:auto;margin:${ margin };border:0;">`
				},
				variable: ( { node } ) => escape( values[ node.attrs.name ] ?? `{{${ node.attrs.name }}}` )
			},
			markMapping: {
				bold     : ( { children } ) => `<strong>${ join( children ) }</strong>`,
				italic   : ( { children } ) => `<em>${ join( children ) }</em>`,
				underline: ( { children } ) => `<u>${ join( children ) }</u>`,
				strike   : ( { children } ) => `<s>${ join( children ) }</s>`,
				code     : ( { children } ) => `<code style="background:#f3f4f6;padding:1px 4px;border-radius:4px;font-family:Menlo,Consolas,monospace;font-size:0.9em;">${ join( children ) }</code>`,
				link     : ( { mark, children } : { mark : Mark, children ?: unknown } ) => `<a href="${ escape( absolute( mark.attrs.href ) ) }" style="color:#2563eb;text-decoration:underline;">${ join( children ) }</a>`
			}
		}
	} )

	return `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1f2937;">${ body }</div>`
}
