import { createRawSnippet } from 'svelte'
import { renderSnippet } from '#lib/components/ui/data-table/index.js'

export function escapeHtml( value : string ) : string {
	return value
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' )
}

// Plain-text cell with classes: `cell: ( { row } ) => muted( row.original.email )`.
// createRawSnippet inserts HTML, so the value is escaped here — a name from the database
// can never become markup. Cells with structure should use renderComponent().
export function textCell( className : string ) {
	return ( value : string ) => renderSnippet(
		createRawSnippet<[ { value : string } ]>( ( get ) => ( {
			render: () => `<span class="${ escapeHtml( className ) }">${ escapeHtml( get().value ) }</span>`
		} ) ),
		{ value }
	)
}
