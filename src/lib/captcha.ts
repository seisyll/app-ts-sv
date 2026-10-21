import * as v from 'valibot'

/* ―― » Captcha, shared by the browser and the server ( src/lib/server/captcha.ts ). The
        browser only ever sees the provider and its SITE key; the secret stays server-side. */

export const CAPTCHA_PROVIDERS = {
	turnstile: {
		label  : 'Cloudflare Turnstile',
		console: 'https://dash.cloudflare.com/?to=/:account/turnstile',
		script : 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
	},
	recaptcha: {
		label  : 'Google reCAPTCHA v3',
		console: 'https://www.google.com/recaptcha/admin/create',
		script : 'https://www.google.com/recaptcha/api.js?render='
	},
	hcaptcha: {
		label  : 'hCaptcha',
		console: 'https://dashboard.hcaptcha.com/sites',
		script : 'https://js.hcaptcha.com/1/api.js?render=explicit'
	}
} as const

export type CaptchaProvider = keyof typeof CAPTCHA_PROVIDERS

export const CAPTCHA_PROVIDER_IDS = Object.keys( CAPTCHA_PROVIDERS ) as CaptchaProvider[]

// What a page needs to show the widget.
export type CaptchaWidgetConfig = { provider : CaptchaProvider, siteKey : string }

// The settings form. `secret` is write-only: blank keeps the stored one.
export const captchaSettingsSchema = v.object( {
	enabled     : v.boolean(),
	provider    : v.picklist( CAPTCHA_PROVIDER_IDS ),
	siteKey     : v.pipe( v.string(), v.trim(), v.maxLength( 200 ) ),
	secret      : v.pipe( v.string(), v.trim(), v.maxLength( 200 ) ),
	mode        : v.picklist( [ 'adaptive', 'always' ] ),
	triggerAfter: v.pipe( v.number(), v.integer(), v.minValue( 1 ), v.maxValue( 20 ) )
} )

export type CaptchaSettingsInput = v.InferOutput<typeof captchaSettingsSchema>
