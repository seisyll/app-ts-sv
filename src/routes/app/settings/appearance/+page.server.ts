import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { m } from '$lib/paraglide/messages'
import { loadAppearance, rememberAppearance, saveWorkspaceAppearance } from '$lib/server/appearance'
import { loadBrandSetting, saveBrand } from '$lib/server/brand'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import { appearancePageSchema } from './schema'
import type { Actions, PageServerLoad } from './$types'

// The workspace default appearance and its brand. Admin-only, like its sibling settings.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { settings: [ 'update' ] } )
	const [ { setting }, brand ] = await Promise.all( [ loadAppearance( user.id ), loadBrandSetting() ] )

	return { form: await superValidate( { ...brand, ...setting }, valibot( appearancePageSchema ) ) }
}

export const actions : Actions = {
	default: async( event ) => {
		const { user } = await requirePermission( event, { settings: [ 'update' ] } )

		return validateForm( event, appearancePageSchema, async( form ) => {
			const { logo, favicon, ...setting } = form.data
			// The brand first: a field it refuses stops the save before anything is written.
			const invalid = await saveBrand( { logo, favicon } )

			if ( invalid )
				return setError( form, invalid, m.brand_not_image() )

			await saveWorkspaceAppearance( setting )
			// The saver's own look changes too ( unless their overrides win ).
			rememberAppearance( event.cookies, ( await loadAppearance( user.id ) ).resolved )

			return message( form, m.appearance_saved() )
		} )
	}
}
