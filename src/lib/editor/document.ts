import { getSchema } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import * as v from 'valibot'
import { m } from '$lib/paraglide/messages'
import { richTextExtensions, safeHref, safeImageSrc, VARIABLE_NAME, type RichText } from './schema'

/* ―― » The trust boundary for rich text. A stored document must be one the schema can build
        ( only known nodes and marks, in allowed places ), with no link or image pointing
        somewhere unsafe ( javascript:, data:, //other-host ) and only well-formed variable
        names. Then the renderers can only ever emit escaped text and those vetted URLs, so
        displaying the HTML needs no sanitizer. Use richTextSchema in any form or endpoint
        that saves rich text; it runs the same check in the browser and on the server. */

// About 60 pages of prose; a document that big is a mistake or an attack.
const MAX_LENGTH = 256 * 1024

let schema : ReturnType<typeof getSchema> | undefined

const unsafe = ( node : ProseMirrorNode ) : boolean => {
	let found = false

	node.descendants( ( child ) => {
		if ( child.type.name === 'image' && !safeImageSrc( child.attrs.src ) )
			found = true
		else if ( child.type.name === 'variable' && !VARIABLE_NAME.test( child.attrs.name ) )
			found = true
		else if ( child.marks.some( ( mark ) => mark.type.name === 'link' && !safeHref( mark.attrs.href ) ) )
			found = true

		return !found
	} )

	return found
}

// The document normalised ( defaults filled in ), or null when it isn't acceptable.
export function parseRichText( value : unknown ) : RichText | null {
	try {
		const json = typeof value === 'string' ? JSON.parse( value ) : value

		if ( JSON.stringify( json ).length > MAX_LENGTH )
			return null

		const node = ( schema ??= getSchema( richTextExtensions ) ).nodeFromJSON( json )

		node.check()

		return node.type.name === 'doc' && !unsafe( node ) ? node.toJSON() as RichText : null
	} catch {
		return null
	}
}

type Json = { type ?: string, text ?: string, content ?: Json[] }

const visible = ( node : Json ) : boolean =>
	node.type === 'image' || node.type === 'variable' || !!node.text?.trim() || ( node.content ?? [] ).some( visible )

// Nothing a reader would see: no text, no image, no variable — for "required" checks.
export const isEmptyRichText = ( doc : RichText | null | undefined ) : boolean => !doc || !visible( doc as Json )

export const EMPTY_RICH_TEXT : RichText = { type: 'doc', content: [ { type: 'paragraph' } ] }

// A valibot field: accepts the JSON ( or its string form, from a form post ) and outputs
// the normalised document.
export const richTextSchema = v.pipe(
	v.unknown(),
	v.rawTransform( ( { dataset, addIssue, NEVER } ) => {
		const doc = parseRichText( dataset.value )

		if ( !doc ) {
			addIssue( { message: m.editor_invalid() } )

			return NEVER
		}

		return doc
	} )
)
