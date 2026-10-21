import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { isEmptyRichText, parseRichText, richTextSchema } from './document'
import { renderEmailHTML, renderRichText } from './render'
import type { RichText } from './schema'

const doc = ( ...content : unknown[] ) => ( { type: 'doc', content } ) as RichText
const p = ( ...content : unknown[] ) => ( { type: 'paragraph', content } )
const text = ( value : string, marks ?: unknown[] ) => ( { type: 'text', text: value, ...( marks ? { marks } : {} ) } )
const link = ( href : string ) => [ { type: 'link', attrs: { href } } ]

describe( 'parseRichText', () => {
	it( 'accepts a document the schema can build, and fills in defaults', () => {
		const parsed = parseRichText( doc( { type: 'heading', attrs: { level: 2 }, content: [ text( 'Hi' ) ] }, p( text( 'there', link( 'https://example.test' ) ) ) ) )

		expect( parsed?.content?.[ 0 ] ).toMatchObject( { type: 'heading', attrs: { level: 2, textAlign: null } } )
		// A form posts it as a string.
		expect( parseRichText( JSON.stringify( doc( p( text( 'x' ) ) ) ) ) ).not.toBeNull()
	} )

	it( 'refuses unknown nodes and marks, and content in the wrong place', () => {
		expect( parseRichText( doc( { type: 'script', content: [ text( 'x' ) ] } ) ) ).toBeNull()
		expect( parseRichText( doc( p( text( 'x', [ { type: 'onclick' } ] ) ) ) ) ).toBeNull()
		expect( parseRichText( doc( text( 'bare text in the doc' ) ) ) ).toBeNull()
		expect( parseRichText( { type: 'paragraph' } ) ).toBeNull()
		expect( parseRichText( 'not json' ) ).toBeNull()
	} )

	it( 'refuses links and images that point somewhere unsafe', () => {
		expect( parseRichText( doc( p( text( 'x', link( 'javascript:alert(1)' ) ) ) ) ) ).toBeNull()
		expect( parseRichText( doc( p( text( 'x', link( 'data:text/html,<script>' ) ) ) ) ) ).toBeNull()
		expect( parseRichText( doc( { type: 'image', attrs: { src: '//evil.test/a.png' } } ) ) ).toBeNull()
		expect( parseRichText( doc( { type: 'image', attrs: { src: 'http://insecure.test/a.png' } } ) ) ).toBeNull()

		expect( parseRichText( doc( p( text( 'x', link( 'mailto:a@example.test' ) ), text( 'y', link( '/app/users' ) ) ) ) ) ).not.toBeNull()
		expect( parseRichText( doc( { type: 'image', attrs: { src: '/media/01a1-thumb' } } ) ) ).not.toBeNull()
	} )

	it( 'refuses malformed variable names and oversized documents', () => {
		expect( parseRichText( doc( p( { type: 'variable', attrs: { name: 'Bad Name' } } ) ) ) ).toBeNull()
		expect( parseRichText( doc( p( { type: 'variable', attrs: { name: 'customer_name' } } ) ) ) ).not.toBeNull()
		expect( parseRichText( doc( p( text( 'x'.repeat( 300 * 1024 ) ) ) ) ) ).toBeNull()
	} )

	it( 'works as a valibot field', () => {
		const schema = v.object( { body: richTextSchema } )

		expect( v.safeParse( schema, { body: doc( p( text( 'ok' ) ) ) } ).success ).toBe( true )
		expect( v.safeParse( schema, { body: doc( p( text( 'x', link( 'javascript:x' ) ) ) ) } ).issues?.[ 0 ].message ).toBe( 'This text contains something that can\'t be saved.' )
	} )

	it( 'knows an empty document', () => {
		expect( isEmptyRichText( doc( { type: 'paragraph' } ) ) ).toBe( true )
		expect( isEmptyRichText( doc( p( text( '   ' ) ) ) ) ).toBe( true )
		expect( isEmptyRichText( doc( p( text( 'a' ) ) ) ) ).toBe( false )
		expect( isEmptyRichText( doc( { type: 'image', attrs: { src: '/media/x' } } ) ) ).toBe( false )
	} )
} )

describe( 'renderRichText', () => {
	it( 'escapes text and attributes', () => {
		const html = renderRichText( doc( p( text( '<script>alert(1)</script>' ) ), { type: 'image', attrs: { src: '/media/a" onerror="x', alt: '"><b>', align: 'left' } } ) )

		expect( html ).toContain( '&lt;script&gt;' )
		expect( html ).not.toContain( '<script>' )
		expect( html ).toContain( 'src="/media/a&quot; onerror=&quot;x"' )
		expect( html ).toContain( 'data-align="left"' )
	} )

	it( 'shows variables as {{name}} chips', () => {
		expect( renderRichText( doc( p( { type: 'variable', attrs: { name: 'customer_name' } } ) ) ) ).toContain( '<span data-variable="customer_name" class="rich-text__variable">{{customer_name}}</span>' )
	} )
} )

describe( 'renderEmailHTML', () => {
	const email = ( content : RichText, values ?: Record<string, string> ) => renderEmailHTML( content, { baseUrl: 'https://app.example.test/', values } )

	it( 'inlines styles and makes app URLs absolute', () => {
		const html = email( doc( { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [ text( 'Hi' ) ] }, p( text( 'see', link( '/app/invoices' ) ) ), { type: 'image', attrs: { src: '/media/abc', alt: 'A', width: 300, align: 'right' } } ) )

		expect( html ).toMatch( /^<div style="font-family:/ )
		expect( html ).toContain( '<h1 style="margin:24px 0 12px;font-size:28px;line-height:1.3;font-weight:700;text-align:center;">Hi</h1>' )
		expect( html ).toContain( 'href="https://app.example.test/app/invoices" style="color:#2563eb;' )
		expect( html ).toContain( '<img src="https://app.example.test/media/abc" alt="A" width="300" style="display:block;max-width:100%;height:auto;margin:0 0 16px auto;border:0;">' )
		expect( html ).not.toContain( 'class=' )
	} )

	it( 'fills in variables, escaped, and leaves unknown ones as {{name}}', () => {
		const html = email( doc( p( text( 'Dear ' ), { type: 'variable', attrs: { name: 'customer_name' } }, text( ', ' ), { type: 'variable', attrs: { name: 'unknown' } } ) ), { customer_name: '<Ada & co>' } )

		expect( html ).toContain( 'Dear &lt;Ada &amp; co&gt;, {{unknown}}' )
	} )

	it( 'keeps empty paragraphs as line spacing and list items tight', () => {
		const html = email( doc( { type: 'paragraph' }, { type: 'bulletList', content: [ { type: 'listItem', content: [ p( text( 'one' ) ) ] } ] } ) )

		expect( html ).toContain( '<p style="margin:0 0 16px;"><br></p>' )
		expect( html ).toContain( '<li style="margin:0 0 4px;"><p style="margin:0;">one</p></li>' )
	} )
} )
