<script lang="ts">
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { page } from '$app/state'
	import { CaptchaWidget } from '$lib/components/captcha'
	import { Alert, AlertDescription } from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Spinner } from '$lib/components/ui/spinner'
	import { loginSchema } from '$lib/auth-schemas'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	let widget = $state<CaptchaWidget>()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( loginSchema ),
		// The captcha's answer rides along when it's shown; it counts once, so ask anew after.
		onSubmit  : async( { formData } ) => {
			if ( widget )
				formData.set( 'captcha', await widget.getToken() ?? '' )
		},
		onResult  : () => widget?.reset()
	} )
	// After a failed attempt the action says whether the next one needs it.
	const captcha = $derived( ( page.form as { captcha ?: typeof data.captcha } | null )?.captcha ?? data.captcha )
	const { form: values, errors, message, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.auth_login_title()}</title>
</svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title><h1 class="text-xl">{m.auth_login_title()}</h1></Card.Title>
		<Card.Description>{m.auth_login_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance novalidate>
			<Field.Group>
				{#if $message}
					<Alert variant="destructive">
						<AlertDescription>{$message}</AlertDescription>
					</Alert>
				{:else if data.linkError}
					<Alert variant="destructive">
						<AlertDescription>{m.auth_verify_link_expired()}</AlertDescription>
					</Alert>
				{/if}

				<Field.Field data-invalid={$errors.email ? true : undefined}>
					<Field.Label for="email">{m.auth_email()}</Field.Label>
					<Input id="email" name="email" type="email" autocomplete="username" bind:value={$values.email} aria-invalid={$errors.email ? true : undefined} />
					<Field.Error errors={shown( $errors.email )} />
				</Field.Field>

				<Field.Field data-invalid={$errors.password ? true : undefined}>
					<div class="flex items-center justify-between gap-2">
						<Field.Label for="password">{m.auth_password()}</Field.Label>
						{#if data.forgot}
							<a href="/forgot-password" class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{m.auth_forgot_link()}</a>
						{/if}
					</div>
					<Input id="password" name="password" type="password" autocomplete="current-password" bind:value={$values.password} aria-invalid={$errors.password ? true : undefined} />
					<Field.Error errors={shown( $errors.password )} />
				</Field.Field>

				{#if MODULES.captcha && captcha}
					<CaptchaWidget bind:this={widget} provider={captcha.provider} siteKey={captcha.siteKey} action="login" />
				{/if}

				<Button type="submit" class="w-full" disabled={$submitting}>
					{#if $submitting}
						<Spinner data-icon="inline-start" />
					{/if}
					{m.auth_login_submit()}
				</Button>
			</Field.Group>
		</form>
	</Card.Content>
	{#if data.signUp}
		<Card.Footer class="text-muted-foreground justify-center text-sm">
			{m.auth_no_account()}&nbsp;<a href="/signup" class="text-foreground underline underline-offset-4">{m.auth_signup_link()}</a>
		</Card.Footer>
	{/if}
</Card.Root>
