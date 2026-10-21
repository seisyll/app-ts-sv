import { mergeAttributes, Node, type Extensions, type JSONContent } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import StarterKit from '@tiptap/starter-kit'

/* ―― » The rich-text schema ( from the fundraiser app's HTMLEditor ), ONE list shared by
        the editor in the browser and the validator and renderers on the server — so a
        document can only contain what all three understand. Browser-only behaviour
        ( Svelte node views, placeholder, typography input rules ) is added by the editor
        component on top, never here. */

// Where a link may point, and where an image may come from. Relative paths are this app
// ( /media/<id> ); `//host` is not relative. Checked on save as well as in the editor.
export const safeHref = ( value : unknown ) : boolean =>
	typeof value === 'string' && ( /^(https?:|mailto:)/i.test( value ) || /^\/(?!\/)/.test( value ) || value.startsWith( '#' ) )

export const safeImageSrc = ( value : unknown ) : boolean =>
	typeof value === 'string' && ( /^https:/i.test( value ) || /^\/(?!\/)/.test( value ) )

// An image that keeps its aspect ratio: only the width is stored, and how it sits ( align ).
export const RichImage = Image.extend( {
	draggable: true,

	addOptions() {
		const parent = this.parent?.()

		return { ...parent, HTMLAttributes: parent?.HTMLAttributes ?? {}, inline: false, allowBase64: false, resize: false as const }
	},

	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default   : null,
				parseHTML : ( element ) => Number.parseInt( element.getAttribute( 'width' ) ?? '', 10 ) || null,
				renderHTML: ( attributes ) => ( attributes.width ? { width: attributes.width } : {} )
			},
			align: {
				default   : 'center',
				parseHTML : ( element ) => element.getAttribute( 'data-align' ) ?? 'center',
				renderHTML: ( attributes ) => ( { 'data-align': attributes.align ?? 'center' } )
			}
		}
	}
} )

// A template variable, {{name}}: one atom, so it can't be half-deleted or mistyped. What it
// becomes is the caller's business ( renderEmailHTML takes the values ).
export const Variable = Node.create( {
	name     : 'variable',
	group    : 'inline',
	inline   : true,
	atom     : true,
	draggable: true,

	addAttributes() {
		return { name: { default: '', parseHTML: ( element ) => element.getAttribute( 'data-variable' ), renderHTML: () => ( {} ) } }
	},

	parseHTML() {
		return [ { tag: 'span[data-variable]' } ]
	},

	renderHTML( { node, HTMLAttributes } ) {
		return [ 'span', mergeAttributes( HTMLAttributes, { 'data-variable': node.attrs.name, class: 'rich-text__variable' } ), `{{${ node.attrs.name }}}` ]
	}
} )

export const VARIABLE_NAME = /^[a-z][a-z0-9_]{0,63}$/

export const richTextExtensions : Extensions = [
	StarterKit.configure( {
		heading: { levels: [ 1, 2, 3 ] },
		link   : {
			openOnClick    : false,
			autolink       : true,
			defaultProtocol: 'https',
			protocols      : [ 'http', 'https', 'mailto' ],
			isAllowedUri   : ( url ) => safeHref( url ) || safeHref( `https://${ url }` ),
			HTMLAttributes : { rel: 'noopener noreferrer nofollow', target: null }
		}
	} ),
	TextAlign.configure( { types: [ 'heading', 'paragraph' ] } ),
	RichImage,
	Variable
]

// What a stored document is: TipTap's JSON.
export type RichText = JSONContent & { type : 'doc' }
