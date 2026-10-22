import { error, fail, type RequestEvent } from '@sveltejs/kit'
import { superValidate, type SuperValidated } from 'sveltekit-superforms'
import { valibot, type Infer, type ValidationAdapter } from 'sveltekit-superforms/adapters'
import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'
import { fieldErrors } from '#lib/validation.js'

/* ―― » The server re-validates every write with the SAME schema the form used. Client
        validation is a convenience; this is the trust boundary.
          • JSON endpoint ( apiForm, mutate ):  const data = await readJson( request, schema )
          • form action ( use:enhance ):        default: ( event ) => validateForm( event, schema, save )
        A page load builds an empty/prefilled form with superValidate( data?, valibot( schema ) ). */

type Schema = v.GenericSchema | v.GenericSchemaAsync

// Parse a JSON body. Invalid → throws 400 { message, errors: { field: [ … ] } }, which
// `http` surfaces as HttpError.fieldErrors and apiForm puts under the fields.
export async function readJson<S extends Schema>( request : Request, schema : S ) : Promise<v.InferOutput<S>> {
	const body = await request.json().catch( () => undefined )
	const result = await v.safeParseAsync( schema, body )

	if ( !result.success )
		error( 400, m.validation_failed(), { errors: fieldErrors( result.issues ) } )

	return result.output
}

// Typed concretely here: a generic superValidate wrapper otherwise hits TypeScript's
// "type instantiation is excessively deep" limit.
const adapterFor = ( schema : Schema ) => valibot( schema ) as unknown as ValidationAdapter<Record<string, unknown>>

// Validate a form action. Invalid → fail( 400, { form } ); valid → onValid( form ), or { form }.
export async function validateForm<S extends Schema, R = { form : SuperValidated<Infer<S>> }>(
	source : Request | RequestEvent,
	schema : S,
	onValid ?: ( form : SuperValidated<Infer<S>> ) => R | Promise<R>
) {
	const form = await superValidate( source, adapterFor( schema ) ) as unknown as SuperValidated<Infer<S>>

	if ( !form.valid )
		return fail( 400, { form } )

	return onValid ? await onValid( form ) : { form } as R
}
