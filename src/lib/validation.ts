import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'

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

/* ―― » Numbers that arrive as text ( billing-app's coercion helpers ): a query string, a
        FormData field read by hand, a JSON client that quotes its numbers. v.number() refuses
        "12", and Number() accepts far too much — Number( true ) is 1, Number( '' ) and
        Number( null ) are 0 — so a boolean or an empty box would quietly become a quantity.
        These take a number or a string holding one, and nothing else. Range checks chain at
        the call site: v.pipe( integerish(), v.minValue( 0 ) ). ( Superforms coerces form
        fields itself; a plain v.number() is right there. ) */
type Message = string | ( () => string )

const numeric = ( value : number | string ) => ( typeof value === 'number' || value.trim() !== '' ) && Number.isFinite( Number( value ) )

export const numberish = ( message ?: Message ) => v.pipe( v.union( [ v.number(), v.string() ], message ), v.check( numeric, message ), v.toNumber() )

export const integerish = ( message ?: Message ) => v.pipe( numberish( message ), v.integer( message ) )

/* ―― » A box someone emptied is an omission. It sends '', and v.optional() only stands in for
        undefined — so clearing an optional number made the whole form unsaveable. '' becomes
        undefined; null does NOT, because a null comes from a caller, not from a person
        clearing a box, and it is exactly the 0 the helpers above refuse. */
export const blankOr = <S extends v.GenericSchema>( schema : S ) => v.optional( v.union( [ v.pipe( v.literal( '' ), v.transform( () => undefined ) ), schema ] ) )
