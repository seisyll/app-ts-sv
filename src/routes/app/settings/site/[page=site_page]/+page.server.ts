import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { EMPTY_RICH_TEXT } from '$lib/editor/document'
import { m } from '$lib/paraglide/messages'
import { audit } from '$lib/server/audit'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import { loadSitePageDraft, saveSitePage } from '$lib/server/site-pages'
import { SITE_PAGES } from '$lib/site'
import type { Actions, PageServerLoad } from './$types'
import { sitePageSchema } from './schema'

// One public page, in the language the admin is using now ( each language is its own copy ).
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { site: [ 'manage' ] } )

	const body = await loadSitePageDraft( event.params.page )

	return {
		key    : event.params.page,
		title  : SITE_PAGES[ event.params.page ](),
		written: !!body,
		form   : await superValidate( { body: body ?? EMPTY_RICH_TEXT }, valibot( sitePageSchema ), { errors: false } )
	}
}

export const actions : Actions = {
	default: async( event ) => {
		await requirePermission( event, { site: [ 'manage' ] } )

		const key = event.params.page
		const target = { id: key, label: SITE_PAGES[ key ]() }

		return validateForm( event, sitePageSchema, async( form ) => {
			const outcome = await saveSitePage( key, form.data.body )

			await audit( event, { action: outcome === 'saved' ? 'site.page' : 'site.page-remove', target } )

			return message( form, outcome === 'saved' ? m.site_page_saved() : m.site_page_removed() )
		} )
	}
}
