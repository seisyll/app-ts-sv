import { error, redirect } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { mailTemplateSchema } from '$lib/mail'
import { m } from '$lib/paraglide/messages'
import { currentTenant } from '$lib/server/db'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import {
	defaultMailContent,
	isMailTemplateKey,
	loadMailTemplate,
	MAIL_TEMPLATES,
	mailVariables,
	renderMail,
	resetMailTemplate,
	sampleMailValues,
	saveMailTemplate,
	type MailTemplateKey
} from '$lib/server/mail'
import type { Actions, PageServerLoad } from './$types'

function templateKey( key : string ) : MailTemplateKey {
	if ( !isMailTemplateKey( key ) || !MAIL_TEMPLATES[ key ].editable )
		error( 404, 'Not found' )

	return key
}

// One email's subject and body, in the language the admin is using now.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { settings: [ 'update' ] } )

	const key = templateKey( event.params.key )
	const [ custom, tenant ] = await Promise.all( [ loadMailTemplate( key ), currentTenant() ] )
	const content = custom ?? defaultMailContent( key )

	return {
		key,
		label      : MAIL_TEMPLATES[ key ].label(),
		description: MAIL_TEMPLATES[ key ].description(),
		variables  : mailVariables( key ),
		customised : !!custom,
		form       : await superValidate( content, valibot( mailTemplateSchema ) ),
		// The saved version with made-up values, as a recipient would see it.
		preview    : renderMail( key, { content, values: { ...sampleMailValues(), workspace: tenant.name }, baseUrl: event.url.origin } )
	}
}

export const actions : Actions = {
	save: async( event ) => {
		await requirePermission( event, { settings: [ 'update' ] } )

		const key = templateKey( event.params.key )

		return validateForm( event, mailTemplateSchema, async( form ) => {
			await saveMailTemplate( key, form.data )

			return message( form, m.mail_template_saved() )
		} )
	},
	reset: async( event ) => {
		await requirePermission( event, { settings: [ 'update' ] } )
		await resetMailTemplate( templateKey( event.params.key ) )

		redirect( 303, event.url.pathname )
	}
}
