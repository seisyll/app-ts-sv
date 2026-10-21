import * as v from 'valibot'
import { m } from '$lib/paraglide/messages'

/* ―― » Localised default messages for valibot, through valibot's own i18n hooks. Schemas
        stay plain — v.pipe( v.string(), v.nonEmpty(), v.email() ) — and every message is
        built when an issue is raised, so it's in the current request's locale on the
        server and the user's locale in the browser. A field that needs its own wording
        passes it: v.minLength( 8, () => m.password_too_short() ).

        Runs when this module is imported; both hooks files import it, so the whole app has
        it before anything parses. ( Tests: src/lib/test/setup.ts. ) */

const isText = ( input : unknown ) => typeof input === 'string'

v.setGlobalMessage( () => m.validation_invalid() )
// Wrong type; `undefined` / `null` means the field was never filled in.
v.setSchemaMessage( ( issue ) => ( issue.input === undefined || issue.input === null ? m.validation_required() : m.validation_invalid() ) )
v.setSpecificMessage( v.nonEmpty, () => m.validation_required() )
v.setSpecificMessage( v.minLength, ( issue ) => ( isText( issue.input )
	? m.validation_min_length( { min: issue.requirement } )
	: m.validation_min_items( { min: issue.requirement } ) ) )
v.setSpecificMessage( v.maxLength, ( issue ) => ( isText( issue.input )
	? m.validation_max_length( { max: issue.requirement } )
	: m.validation_max_items( { max: issue.requirement } ) ) )
v.setSpecificMessage( v.email, () => m.validation_email() )
v.setSpecificMessage( v.url, () => m.validation_url() )
v.setSpecificMessage( v.minValue, ( issue ) => m.validation_min_value( { min: String( issue.requirement ) } ) )
v.setSpecificMessage( v.maxValue, ( issue ) => m.validation_max_value( { max: String( issue.requirement ) } ) )
v.setSpecificMessage( v.integer, () => m.validation_integer() )

// Issues → { 'address.city': [ messages ] }, the shape superforms and Field.Error read.
// Issues without a path ( the whole value ) go under `_errors`.
export function fieldErrors( issues : readonly v.BaseIssue<unknown>[] ) : Record<string, string[]> {
	const errors : Record<string, string[]> = {}

	for ( const issue of issues ) {
		const path = v.getDotPath( issue ) ?? '_errors';

		( errors[ path ] ??= [] ).push( issue.message )
	}

	return errors
}
