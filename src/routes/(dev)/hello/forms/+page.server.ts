import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { m } from '$lib/paraglide/messages'
import { validateForm } from '$lib/server/forms'
import { newsletterSchema } from './schema'
import type { Actions, PageServerLoad } from './$types'

// The form-action half of the demo: works without JavaScript, enhanced when it's there.
export const load : PageServerLoad = async() => ( {
	newsletter: await superValidate( valibot( newsletterSchema ) )
} )

export const actions : Actions = {
	subscribe: ( event ) => validateForm( event, newsletterSchema, ( form ) =>
		message( form, m.demo_forms_subscribed( { email: form.data.email } ) ) )
}
