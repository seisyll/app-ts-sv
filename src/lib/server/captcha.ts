import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import { CAPTCHA_PROVIDER_IDS, type CaptchaProvider, type CaptchaSettingsInput, type CaptchaWidgetConfig } from '$lib/captcha'
import { currentTenant, db } from '$lib/server/db'
import { moduleActive } from '$lib/server/modules'

/* ―― » The workspace's captcha ( the fundraiser app's Captcha.ts, plus hCaptcha ): set on
        /app/settings/security, checked by the sign-in guard ( src/lib/server/sign-in-guard.ts ).
        The secret is encrypted with BETTER_AUTH_SECRET — rotating that makes it unreadable,
        and the captcha is then off until the secret is entered again. */

const key = () => process.env.BETTER_AUTH_SECRET ?? ''

// The settings form's view: never the secret, only whether one is stored.
export type CaptchaSettingsView = Omit<CaptchaSettingsInput, 'secret'> & { hasSecret : boolean }

const isProvider = ( value : string ) : value is CaptchaProvider => CAPTCHA_PROVIDER_IDS.includes( value as CaptchaProvider )

export async function loadCaptchaSettings() : Promise<CaptchaSettingsView> {
	const row = await db.captchaSetting.findFirst()

	return {
		enabled     : row?.enabled ?? false,
		provider    : row && isProvider( row.provider ) ? row.provider : 'turnstile',
		siteKey     : row?.siteKey ?? '',
		mode        : row?.mode === 'always' ? 'always' : 'adaptive',
		triggerAfter: row?.triggerAfter ?? 3,
		hasSecret   : !!row?.secret
	}
}

// A blank secret keeps the stored one; a new provider needs its own.
export async function saveCaptchaSettings( input : CaptchaSettingsInput ) : Promise<void> {
	const { secret, ...rest } = input
	const stored = await db.captchaSetting.findFirst( { select: { provider: true } } )
	const data = {
		...rest,
		...( secret ? { secret: await symmetricEncrypt( { key: key(), data: secret } ) } : stored && stored.provider !== input.provider ? { secret: null } : {} )
	}

	await db.captchaSetting.upsert( { where: { tenantId: ( await currentTenant() ).id }, create: data, update: data } )
}

export type ActiveCaptcha = CaptchaWidgetConfig & { secret : string, mode : 'adaptive' | 'always', triggerAfter : number }

// The saved keys, on or not ( the settings page's test ). Null when incomplete.
export async function storedCaptcha() : Promise<ActiveCaptcha & { enabled : boolean } | null> {
	const row = await db.captchaSetting.findFirst()

	if ( !row?.siteKey || !row.secret || !isProvider( row.provider ) )
		return null

	try {
		const secret = await symmetricDecrypt( { key: key(), data: row.secret } )

		return { enabled: row.enabled, provider: row.provider, siteKey: row.siteKey, secret, mode: row.mode === 'always' ? 'always' : 'adaptive', triggerAfter: row.triggerAfter }
	} catch {
		console.warn( '[captcha] the stored secret no longer decrypts ( BETTER_AUTH_SECRET changed? ): captcha is off until it is entered again' )

		return null
	}
}

/* ―― » The captcha in force for this workspace, or null: the module off, switched off, or
        incomplete. A half-set captcha is off rather than locking everyone out of sign-in. */
export async function activeCaptcha() : Promise<ActiveCaptcha | null> {
	if ( !MODULES.captcha || !await moduleActive( 'captcha' ) )
		return null

	const stored = await storedCaptcha()

	return stored?.enabled ? stored : null
}

const VERIFY : Record<CaptchaProvider, string> = {
	turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
	recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
	hcaptcha : 'https://api.hcaptcha.com/siteverify'
}

// reCAPTCHA v3 scores a request 0..1 instead of passing or failing it.
const RECAPTCHA_MIN_SCORE = 0.5

// Did the provider accept this token? Any failure to ask it is a no.
export async function verifyCaptcha( captcha : ActiveCaptcha, token : string, ip ?: string | null ) : Promise<boolean> {
	const body = new URLSearchParams( { secret: captcha.secret, response: token } )

	if ( ip )
		body.set( 'remoteip', ip )

	if ( captcha.provider === 'hcaptcha' )
		body.set( 'sitekey', captcha.siteKey )

	try {
		const response = await fetch( VERIFY[ captcha.provider ], { method: 'POST', body, signal: AbortSignal.timeout( 10_000 ) } )
		const answer = await response.json() as { success ?: boolean, score ?: number }

		return answer.success === true && ( captcha.provider !== 'recaptcha' || ( answer.score ?? 0 ) >= RECAPTCHA_MIN_SCORE )
	} catch {
		return false
	}
}
