<script lang="ts" module>
	import { CAPTCHA_PROVIDERS, type CaptchaProvider } from '#lib/captcha.js'

	// Each provider's script once per page, ready when it says so: Turnstile and hCaptcha
	// call `onload`, reCAPTCHA's grecaptcha.ready() is awaited where it's used.
	// ponytail: reCAPTCHA's script is bound to the first site key it loads with; a page that
	// switches keys ( the settings preview ) needs a reload to try the new one.
	const loading = new Map<CaptchaProvider, Promise<void>>()

	function load( provider : CaptchaProvider, siteKey : string ) : Promise<void> {
		let pending = loading.get( provider )

		if ( !pending ) {
			pending = new Promise<void>( ( resolve, reject ) => {
				const callback = `__captchaReady_${ provider }`
				const src = provider === 'recaptcha' ? `${ CAPTCHA_PROVIDERS.recaptcha.script }${ siteKey }` : `${ CAPTCHA_PROVIDERS[ provider ].script }&onload=${ callback }`
				const script = Object.assign( document.createElement( 'script' ), { src, async: true } )

				Object.assign( window, { [ callback ]: () => resolve() } )

				if ( provider === 'recaptcha' )
					script.addEventListener( 'load', () => resolve() )

				script.addEventListener( 'error', () => {
					loading.delete( provider )
					reject( new Error( 'captcha' ) )
				} )
				document.head.append( script )
			} )
			loading.set( provider, pending )
		}

		return pending
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte'

	/* ―― » The workspace's captcha in a form ( the fundraiser app's CaptchaWidget, plus
	        hCaptcha ). Turnstile and hCaptcha draw their box here; reCAPTCHA v3 is invisible
	        ( Google's badge is all that shows ). The form awaits `getToken()` as it submits
	        and posts the answer as `captcha`, then calls `reset()`: an answer counts once.
	        A script that won't load resolves null, and the server says the check is missing. */
	let { provider, siteKey, action = 'submit' } : {
		provider  : CaptchaProvider
		siteKey   : string
		// reCAPTCHA's label for the request, e.g. login ( letters, digits, _ and / ).
		action ?  : string
	} = $props()

	type BoxApi = {
		render      : ( host : HTMLElement, options : Record<string, unknown> ) => string
		getResponse : ( id : string ) => string | undefined
		reset       : ( id : string ) => void
		remove      : ( id : string ) => void
	}
	type RecaptchaApi = {
		ready   : ( callback : () => void ) => void
		execute : ( siteKey : string, options : { action : string } ) => Promise<string>
	}
	type Globals = { turnstile ?: BoxApi, hcaptcha ?: BoxApi, grecaptcha ?: RecaptchaApi }

	const GLOBAL = { turnstile: 'turnstile', hcaptcha: 'hcaptcha', recaptcha: 'grecaptcha' } as const
	const globals = () => window as unknown as Globals
	// svelte-ignore state_referenced_locally
	const box = () => ( provider === 'recaptcha' ? undefined : globals()[ GLOBAL[ provider ] ] )

	let host = $state<HTMLDivElement>()
	let widgetId : string | undefined
	let token : string | null = null
	let waiting : ( ( value : string | null ) => void )[] = []

	async function render() : Promise<void> {
		if ( provider === 'recaptcha' || widgetId || !host )
			return

		await load( provider, siteKey ).catch( () => {} )

		const api = box()

		if ( !api || !host || widgetId )
			return

		widgetId = api.render( host, {
			sitekey           : siteKey,
			// Turnstile follows the system; hCaptcha needs telling.
			theme             : provider === 'turnstile' ? 'auto' : document.documentElement.classList.contains( 'dark' ) ? 'dark' : 'light',
			callback          : ( value : string ) => {
				token = value

				for ( const done of waiting.splice( 0 ) )
					done( value )
			},
			'expired-callback': () => ( token = null ),
			'error-callback'  : () => ( token = null )
		} )
	}

	onMount( () => {
		void render()

		return () => {
			if ( widgetId )
				box()?.remove( widgetId )
		}
	} )

	export async function getToken() : Promise<string | null> {
		if ( provider === 'recaptcha' ) {
			const ready = await load( provider, siteKey ).then( () => true, () => false )
			const api = globals().grecaptcha

			return ready && api ? new Promise( ( resolve ) => api.ready( () => api.execute( siteKey, { action } ).then( resolve, () => resolve( null ) ) ) ) : null
		}

		await render()
		token ??= ( widgetId && box()?.getResponse( widgetId ) ) || null

		// Turnstile may still be running its managed check: give it a moment. An unticked
		// hCaptcha box is the person's to tick.
		if ( token || provider !== 'turnstile' )
			return token

		return new Promise( ( resolve ) => {
			const timer = setTimeout( () => resolve( token ), 8_000 )

			waiting.push( ( value ) => {
				clearTimeout( timer )
				resolve( value )
			} )
		} )
	}

	export function reset() : void {
		token = null

		if ( widgetId )
			box()?.reset( widgetId )
	}
</script>

{#if provider !== 'recaptcha'}
	<div bind:this={host} class="flex min-h-16 justify-center"></div>
{/if}
