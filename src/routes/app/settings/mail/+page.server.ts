import { fail } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { dev } from '$app/env'
import { mailSettingsSchema, type MailSettingsInput } from '#lib/mail.js'
import { m } from '#lib/paraglide/messages.js'
import { audit, changesBetween } from '#lib/server/audit.js'
import { currentTenant } from '#lib/server/db/index.js'
import { validateForm } from '#lib/server/forms.js'
import { requirePermission } from '#lib/server/guards.js'
import { customisedMailTemplates, loadMailSettings, MAIL_TEMPLATE_KEYS, MAIL_TEMPLATES, saveMailSettings, sendMail } from '#lib/server/mail/index.js'
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
			const before = await loadMailSettings()

			await saveMailSettings( form.data )
			await audit( event, { action: 'mail.settings', changes: changesBetween( before, form.data, { secret: [ 'password' ] } ) } )
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
