import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { m } from '$lib/paraglide/messages'
import { audit, changesBetween } from '$lib/server/audit'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import { loadSiteSetting, saveSiteSetting, writtenSitePages } from '$lib/server/site'
import { SITE_PAGE_KEYS, SITE_PAGES, SOCIAL_NETWORK_IDS, SOCIAL_NETWORKS, siteSettingsSchema, type SiteSettingsInput } from '$lib/site'
import type { Actions, PageServerLoad } from './$types'

// The trail reads one field per link, named for its network: "GitHub: — → https://…".
const flat = ( { links, ...rest } : SiteSettingsInput ) => ( { ...rest, ...Object.fromEntries( SOCIAL_NETWORK_IDS.map( ( network ) => [ SOCIAL_NETWORKS[ network ], links[ network ] ] ) ) } )

// The footer's details, and the pages ( rich text, so only with the editor in the build ).
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { site: [ 'manage' ] } )

	const [ setting, written ] = await Promise.all( [ loadSiteSetting(), MODULES.editor ? writtenSitePages() : null ] )

	return {
		form : await superValidate( setting, valibot( siteSettingsSchema ), { errors: false } ),
		pages: MODULES.editor ? SITE_PAGE_KEYS.map( ( key ) => ( { key, title: SITE_PAGES[ key ](), written: !!written?.includes( key ) } ) ) : []
	}
}

export const actions : Actions = {
	default: async( event ) => {
		await requirePermission( event, { site: [ 'manage' ] } )

		return validateForm( event, siteSettingsSchema, async( form ) => {
			const before = await loadSiteSetting()

			await saveSiteSetting( form.data )
			await audit( event, { action: 'site.settings', changes: changesBetween( flat( before ), flat( form.data ) ) } )

			return message( form, m.site_settings_saved() )
		} )
	}
}
