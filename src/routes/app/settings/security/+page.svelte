<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
	import { deserialize } from '$app/forms'
	import { CAPTCHA_PROVIDER_IDS, CAPTCHA_PROVIDERS, captchaSettingsSchema, type CaptchaProvider } from '$lib/captcha'
	import { CaptchaWidget } from '$lib/components/captcha'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import { SaveBar } from '$lib/components/save-bar'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( captchaSettingsSchema ),
		resetForm : false,
		onUpdated : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const dirty = $derived( form.isTainted( $tainted ) )
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )

	const about : Record<CaptchaProvider, () => string> = {
		turnstile: m.captcha_about_turnstile,
		recaptcha: m.captcha_about_recaptcha,
		hcaptcha : m.captcha_about_hcaptcha
	}

	// The preview: the widget as the sign-in page draws it, and its answer checked with the
	// saved keys.
	let widget = $state<CaptchaWidget>()
	let testing = $state( false )
	let result = $state<{ ok : boolean, text : string }>()

	async function test() {
		testing = true
		result = undefined

		const body = new FormData()

		body.set( 'token', await widget?.getToken() ?? '' )

		const response = await fetch( '?/test', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } } )
		const answer = deserialize( await response.text() )

		result = answer.type === 'success' || answer.type === 'failure' ? ( answer.data as { test : { ok : boolean, text : string } } ).test : { ok: false, text: m.captcha_test_failed() }
		widget?.reset()
		testing = false
	}

	const option = 'cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50'
</script>

<svelte:head>
	<title>{m.captcha_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.captcha_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.captcha_desc()}</p>
</div>

<!-- pb-24 keeps the last card clear of the SaveBar. -->
<form method="POST" action="?/save" use:enhance class="flex max-w-3xl flex-col gap-6 pb-24">
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.captcha_throttle()}</Card.Title>
			<Card.Description>{m.captcha_throttle_desc()}</Card.Description>
			<Card.Action>
				<Badge variant={data.throttle ? 'default' : 'outline'}>{data.throttle ? m.app_on() : m.app_off()}</Badge>
			</Card.Action>
		</Card.Header>
		{#if !data.throttle}
			<Card.Content>
				<p class="text-sm text-muted-foreground">{m.captcha_throttle_off()}</p>
			</Card.Content>
		{/if}
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.captcha_card()}</Card.Title>
			<Card.Description>{m.captcha_card_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="enabled">{m.captcha_enabled()}</Field.Label>
					<Field.Description>{m.captcha_enabled_desc()}</Field.Description>
				</Field.Content>
				<Switch id="enabled" name="enabled" bind:checked={$values.enabled} />
			</Field.Field>

			<fieldset class="grid gap-2 sm:grid-cols-3">
				<legend class="mb-2 text-sm font-medium">{m.captcha_provider()}</legend>
				{#each CAPTCHA_PROVIDER_IDS as provider ( provider )}
					<label class={cn( 'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 has-checked:border-foreground has-checked:bg-muted/50', option )}>
						<input type="radio" name="provider" value={provider} bind:group={$values.provider} class="sr-only" />
						<span class="text-sm font-medium">{CAPTCHA_PROVIDERS[ provider ].label}</span>
						<span class="text-xs text-muted-foreground">{about[ provider ]()}</span>
					</label>
				{/each}
			</fieldset>

			<div class="flex flex-col gap-3">
				<Field.Group class="grid gap-4 sm:grid-cols-2">
					<Field.Field data-invalid={$errors.siteKey ? true : undefined}>
						<Field.Label for="siteKey">{m.captcha_site_key()}</Field.Label>
						<Input id="siteKey" name="siteKey" autocomplete="off" spellcheck="false" bind:value={$values.siteKey} aria-invalid={$errors.siteKey ? true : undefined} />
						<Field.Error errors={shown( $errors.siteKey )} />
					</Field.Field>
					<Field.Field data-invalid={$errors.secret ? true : undefined}>
						<Field.Label for="secret">{m.captcha_secret()}</Field.Label>
						<Input id="secret" name="secret" type="password" autocomplete="new-password" placeholder={data.hasSecret ? m.captcha_secret_kept() : ''} bind:value={$values.secret} aria-invalid={$errors.secret ? true : undefined} />
						<Field.Error errors={shown( $errors.secret )} />
					</Field.Field>
				</Field.Group>
				<a href={CAPTCHA_PROVIDERS[ $values.provider ].console} target="_blank" rel="noreferrer" class="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
					{m.captcha_get_keys( { provider: CAPTCHA_PROVIDERS[ $values.provider ].label } )}<ExternalLinkIcon class="size-3.5" />
				</a>
			</div>

			<fieldset class="flex flex-col gap-2">
				<legend class="mb-2 text-sm font-medium">{m.captcha_mode()}</legend>
				{#each [ 'adaptive', 'always' ] as const as mode ( mode )}
					<label class={cn( 'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 has-checked:border-foreground has-checked:bg-muted/50', option )}>
						<input type="radio" name="mode" value={mode} bind:group={$values.mode} class="sr-only" />
						<span class="text-sm font-medium">{mode === 'adaptive' ? m.captcha_mode_adaptive() : m.captcha_mode_always()}</span>
						<span class="text-xs text-muted-foreground">{mode === 'adaptive' ? m.captcha_mode_adaptive_desc() : m.captcha_mode_always_desc()}</span>
					</label>
				{/each}
			</fieldset>
			{#if $values.mode === 'adaptive'}
				<Field.Field class="max-w-60" data-invalid={$errors.triggerAfter ? true : undefined}>
					<Field.Label for="triggerAfter">{m.captcha_trigger()}</Field.Label>
					<Input id="triggerAfter" name="triggerAfter" type="number" min="1" max="20" bind:value={$values.triggerAfter} aria-invalid={$errors.triggerAfter ? true : undefined} />
					<Field.Error errors={shown( $errors.triggerAfter )} />
				</Field.Field>
			{:else}
				<input type="hidden" name="triggerAfter" value={$values.triggerAfter} />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.captcha_preview()}</Card.Title>
			<Card.Description>{m.captcha_preview_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-start gap-4">
			{#if $values.siteKey}
				{#key `${ $values.provider }:${ $values.siteKey }`}
					<CaptchaWidget bind:this={widget} provider={$values.provider} siteKey={$values.siteKey} action="test" />
				{/key}
				<div class="flex flex-wrap items-center gap-3">
					<Button type="button" variant="outline" size="sm" disabled={testing || dirty} onclick={test}>{m.captcha_test()}</Button>
					{#if dirty}
						<span class="text-xs text-muted-foreground">{m.captcha_test_save_first()}</span>
					{:else if result}
						<span class={cn( 'text-sm', !result.ok && 'text-destructive' )} role="status">{result.text}</span>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">{m.captcha_preview_empty()}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
</form>
