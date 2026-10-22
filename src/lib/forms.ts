import { get } from 'svelte/store'
import { defaults, setError, superForm } from 'sveltekit-superforms'
import { valibot, type Infer } from 'sveltekit-superforms/adapters'
import { toast } from 'svelte-sonner'
import type * as v from 'valibot'
import { errorMessage, isHttpError } from '#lib/http.js'

type Schema = v.GenericSchema<Record<string, unknown>, Record<string, unknown>>

export type ApiFormOptions<S extends Schema> = {
	// Starting values ( e.g. the record being edited ); missing fields get schema defaults.
	initial ?   : Partial<v.InferInput<S>>
	// Send the valid data, e.g. ( data ) => http.put( '/api/profile', data ). Throw to fail:
	// an HttpError with field errors ( readJson on the server ) lands under the fields.
	submit      : ( data : v.InferOutput<S> ) => Promise<unknown>
	// Toast after a successful save.
	success ?   : string | ( ( data : v.InferOutput<S> ) => string )
	onSuccess ? : ( result : unknown, data : v.InferOutput<S> ) => void
	// Needed when two forms share a page.
	id ?        : string
}

/* ―― » A form that saves to a JSON endpoint ( superforms in SPA mode ): validates in the
        browser with the schema, submits through `submit`, maps the server's field errors
        back onto the fields, and after a save makes the saved values the new clean state —
        so `form.isTainted( $tainted )` is exactly "unsaved changes" for <SaveBar>:

          const form = apiForm( profileSchema, { initial: data.profile, submit: ( d ) => http.put( '/api/profile', d ) } )
          const { form: values, errors, tainted, submitting, enhance } = form
          <form method="POST" use:enhance novalidate> … <SaveBar dirty={form.isTainted( $tainted )} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} /> </form>

        `novalidate`: the schema validates; the browser's own popups would race it. */
export function apiForm<S extends Schema>( schema : S, options : ApiFormOptions<S> ) {
	const adapter = valibot( schema )
	// How the last submit went, for onUpdated: a save resets the clean baseline; a failure
	// restores the unsaved marks, which superforms clears after any client-valid submit.
	let outcome : 'saved' | 'failed' | 'invalid' = 'invalid'
	let taintedBefore : unknown

	// Seed typed from the schema: inferred from `initial ?? {}` the form would be shaped `{}`.
	const seed = ( options.initial ?? {} ) as Partial<Infer<S, 'valibot'>>
	const form = superForm( defaults( seed, adapter ), {
		id        : options.id,
		SPA       : true,
		dataType  : 'json',
		validators: adapter,
		resetForm : false,
		// No page action to apply and nothing to reload: the endpoint did the work, and
		// the caller refreshes what it needs ( onSuccess ). applyAction also needs the
		// SvelteKit runtime, which component tests don't have.
		applyAction  : false,
		invalidateAll: false,
		onUpdate     : async( { form: submitted } ) => {
			outcome = 'invalid'

			if ( !submitted.valid )
				return

			taintedBefore = get( form.tainted )

			try {
				const result = await options.submit( submitted.data as v.InferOutput<S> )
				const success = typeof options.success === 'function' ? options.success( submitted.data as v.InferOutput<S> ) : options.success

				outcome = 'saved'

				if ( success )
					toast.success( success )

				options.onSuccess?.( result, submitted.data as v.InferOutput<S> )
			} catch ( caught ) {
				const errors = isHttpError( caught ) ? caught.fieldErrors : undefined

				outcome = 'failed'

				// Field errors go next to their fields; anything else is a toast.
				if ( errors )
					for ( const [ path, messages ] of Object.entries( errors ) )
						setError( submitted, ( path === '_errors' ? '' : path ) as never, messages )
				else
					toast.error( errorMessage( caught ) )
			}
		},
		onUpdated: ( { form: updated } ) => {
			if ( outcome === 'saved' )
				form.reset( { newState: updated.data } )
			else if ( outcome === 'failed' )
				form.tainted.set( taintedBefore as typeof form.tainted extends { set : ( value : infer T ) => void } ? T : never )
		}
	} )

	return form
}
