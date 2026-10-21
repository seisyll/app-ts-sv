import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { appearanceSettingSchema } from '$lib/appearance'
import { m } from '$lib/paraglide/messages'
import { loadAppearance, rememberAppearance, saveWorkspaceAppearance } from '$lib/server/appearance'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import type { Actions, PageServerLoad } from './$types'

// The workspace default appearance. Admin-only, like its sibling settings.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { settings: [ 'update' ] } )
	const { setting } = await loadAppearance( user.id )

	return { form: await superValidate( setting, valibot( appearanceSettingSchema ) ) }
}

export const actions : Actions = {
	default: async( event ) => {
		const { user } = await requirePermission( event, { settings: [ 'update' ] } )

		return validateForm( event, appearanceSettingSchema, async( form ) => {
			await saveWorkspaceAppearance( form.data )
			// The saver's own look changes too ( unless their overrides win ).
			rememberAppearance( event.cookies, ( await loadAppearance( user.id ) ).resolved )

			return message( form, m.appearance_saved() )
		} )
	}
}
