import { fail } from '@sveltejs/kit'
import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { captchaSettingsSchema } from '$lib/captcha'
import { m } from '$lib/paraglide/messages'
import { loadCaptchaSettings, saveCaptchaSettings, storedCaptcha, verifyCaptcha } from '$lib/server/captcha'
import { validateForm } from '$lib/server/forms'
import { requirePermission } from '$lib/server/guards'
import { redisReady } from '$lib/server/redis'
import type { Actions, PageServerLoad } from './$types'

// Sign-in protection: the workspace's captcha, and whether the throttle is running.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { settings: [ 'update' ] } )

	const { hasSecret, ...settings } = await loadCaptchaSettings()

	return {
		form    : await superValidate( { ...settings, secret: '' }, valibot( captchaSettingsSchema ), { errors: false } ),
		hasSecret,
		throttle: redisReady()
	}
}

export const actions : Actions = {
	save: async( event ) => {
		await requirePermission( event, { settings: [ 'update' ] } )

		return validateForm( event, captchaSettingsSchema, async( form ) => {
			// On needs both keys: a new provider can't keep the old one's secret.
			if ( form.data.enabled ) {
				const { provider, hasSecret } = await loadCaptchaSettings()

				if ( !form.data.siteKey )
					return setError( form, 'siteKey', m.captcha_key_needed() )

				if ( !form.data.secret && ( !hasSecret || provider !== form.data.provider ) )
					return setError( form, 'secret', m.captcha_key_needed() )
			}

			await saveCaptchaSettings( form.data )
			// Write-only: it never travels back to the browser.
			form.data.secret = ''

			return message( form, m.captcha_saved() )
		} )
	},
	// An answer from the preview, checked with the SAVED keys: proves the pair and the domain.
	test: async( event ) => {
		await requirePermission( event, { settings: [ 'update' ] } )

		const token = String( ( await event.request.formData() ).get( 'token' ) ?? '' )
		const captcha = await storedCaptcha()

		if ( !captcha )
			return fail( 400, { test: { ok: false, text: m.captcha_test_unsaved() } } )

		const ok = !!token && await verifyCaptcha( captcha, token, event.getClientAddress() )

		return ok ? { test: { ok, text: m.captcha_test_passed() } } : fail( 400, { test: { ok, text: m.captcha_test_failed() } } )
	}
}
