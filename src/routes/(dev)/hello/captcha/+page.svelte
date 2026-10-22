<script lang="ts">
	import { CaptchaWidget } from '#lib/components/captcha/index.js'
	import { CAPTCHA_PROVIDERS, type CaptchaProvider } from '#lib/captcha.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'

	// The providers' own test keys: always pass, work on any host, verify against their test
	// secrets only. reCAPTCHA v3 has none, so it isn't here.
	const DEMOS : { provider : CaptchaProvider, siteKey : string }[] = [
		{ provider: 'turnstile', siteKey: '1x00000000000000000000AA' },
		{ provider: 'hcaptcha', siteKey: '10000000-ffff-ffff-ffff-000000000001' }
	]

	const widgets : Partial<Record<CaptchaProvider, CaptchaWidget>> = $state( {} )
	const answers : Partial<Record<CaptchaProvider, string>> = $state( {} )

	async function answer( provider : CaptchaProvider ) {
		const token = await widgets[ provider ]?.getToken()

		answers[ provider ] = token ? `${ token.slice( 0, 24 ) }…` : m.demo_captcha_none()
	}
</script>

<svelte:head>
	<title>Captcha · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">Captcha</h1>
	<p class="text-sm text-muted-foreground">{m.demo_captcha_desc()}</p>
</div>

{#each DEMOS as demo ( demo.provider )}
	<Card.Root>
		<Card.Header>
			<Card.Title>{CAPTCHA_PROVIDERS[ demo.provider ].label}</Card.Title>
			<Card.Description>{m.demo_captcha_test_key()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-start gap-3">
			<CaptchaWidget bind:this={widgets[ demo.provider ]} provider={demo.provider} siteKey={demo.siteKey} action="demo" />
			<div class="flex flex-wrap items-center gap-3">
				<Button variant="outline" size="sm" onclick={() => answer( demo.provider )}>{m.demo_captcha_get()}</Button>
				<Button variant="ghost" size="sm" onclick={() => { widgets[ demo.provider ]?.reset(); answers[ demo.provider ] = undefined }}>{m.demo_captcha_reset()}</Button>
				{#if answers[ demo.provider ]}<code class="text-xs text-muted-foreground">{answers[ demo.provider ]}</code>{/if}
			</div>
		</Card.Content>
	</Card.Root>
{/each}
