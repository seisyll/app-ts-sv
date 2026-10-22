import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { m } from '#lib/paraglide/messages.js'
import { loadAppearance, rememberAppearance, saveWorkspaceAppearance } from '#lib/server/appearance.js'
import { audit, changesBetween } from '#lib/server/audit.js'
import { brandImagesOn, loadBrandSetting, saveBrand } from '#lib/server/brand.js'
import { validateForm } from '#lib/server/forms.js'
import { requirePermission } from '#lib/server/guards.js'
import { appearancePageSchema } from './schema'
import type { Actions, PageServerLoad } from './$types'

// The workspace default appearance and its brand. Admin-only, like its sibling settings.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { settings: [ 'update' ] } )
	const [ { setting }, brand, brandImages ] = await Promise.all( [ loadAppearance( user.id ), loadBrandSetting(), brandImagesOn() ] )

	// brandImages: the logo and favicon cards ( they pick from the media library ).
	return { form: await superValidate( { ...brand, ...setting }, valibot( appearancePageSchema ) ), brandImages }
}

export const actions : Actions = {
	default: async( event ) => {
		const { user } = await requirePermission( event, { settings: [ 'update' ] } )

		return validateForm( event, appearancePageSchema, async( form ) => {
			const { logo, favicon, ...setting } = form.data
			const [ { setting: before }, brand ] = await Promise.all( [ loadAppearance( user.id ), loadBrandSetting() ] )
			// The brand first: a field it refuses stops the save before anything is written.
			// Without the media library there are no cards, so nothing to save or clear.
			const invalid = await brandImagesOn() ? await saveBrand( { logo, favicon } ) : null

			if ( invalid )
				return setError( form, invalid, m.brand_not_image() )

			await saveWorkspaceAppearance( setting )
			await audit( event, { action: 'appearance.update', changes: changesBetween( { ...before, ...brand }, form.data ) } )
			// The saver's own look changes too ( unless their overrides win ).
			rememberAppearance( event.cookies, ( await loadAppearance( user.id ) ).resolved )

			return message( form, m.appearance_saved() )
		} )
	}
}
