import { fail } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { dev } from '$app/environment'
import { mailSettingsSchema, type MailSettingsInput } from '$lib/mail'
import { m } from '$lib/paraglide/messages'
import { currentTenant } from '$lib/server/db'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import { customisedMailTemplates, loadMailSettings, MAIL_TEMPLATE_KEYS, MAIL_TEMPLATES, saveMailSettings, sendMail } from '$lib/server/mail'
import type { Actions, PageServerLoad } from './$types'

// The workspace's mail server and its emails. Admin-only, like its sibling settings.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { settings: [ 'update' ] } )

	const [ settings, customised, tenant ] = await Promise.all( [ loadMailSettings(), customisedMailTemplates(), currentTenant() ] )
	const blank : MailSettingsInput = { host: '', port: 587, security: 'starttls', username: '', password: '', fromName: tenant.name, fromEmail: '' }

	return {
		form       : await superValidate( settings ? { ...settings, password: '' } : blank, valibot( mailSettingsSchema ), { errors: false } ),
		configured : !!settings,
		hasPassword: settings?.hasPassword ?? false,
		dev,
		templates  : MAIL_TEMPLATE_KEYS
			.filter( ( key ) => MAIL_TEMPLATES[ key ].editable )
			.map( ( key ) => ( { key, label: MAIL_TEMPLATES[ key ].label(), description: MAIL_TEMPLATES[ key ].description(), customised: customised.has( key ) } ) )
	}
}

export const actions : Actions = {
	save: async( event ) => {
		await requirePermission( event, { settings: [ 'update' ] } )

		return validateForm( event, mailSettingsSchema, async( form ) => {
			await saveMailSettings( form.data )
			// Write-only: it never travels back to the browser.
			form.data.password = ''

			return message( form, m.mail_saved() )
		} )
	},
	// To the admin's own address, through the SAVED settings.
	test: async( event ) => {
		const { user } = await requirePermission( event, { settings: [ 'update' ] } )

		try {
			await sendMail( { to: user, template: 'mail.test' } )
		} catch ( caught ) {
			return fail( 400, { test: m.mail_test_failed( { reason: caught instanceof Error ? caught.message : String( caught ) } ) } )
		}

		return { test: m.mail_test_sent( { email: user.email } ) }
	}
}
