<script lang="ts">
	import { superForm } from 'sveltekit-superforms'
	import { CaptchaWidget } from '$lib/components/captcha'
	import { SocialButtons } from '$lib/components/social'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { Alert, AlertDescription } from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Spinner } from '$lib/components/ui/spinner'
	import { signupSchema } from '$lib/auth-schemas'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	let widget = $state<CaptchaWidget>()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( signupSchema ),
		// The captcha's answer rides along when it's shown; it counts once, so ask anew after.
		onSubmit  : async( { formData } ) => {
			if ( widget )
				formData.set( 'captcha', await widget.getToken() ?? '' )
		},
		onResult  : () => widget?.reset()
	} )
	const { form: values, errors, message, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.auth_signup_title()}</title>
</svelte:head>

{#if data.sent}
	<Card.Root>
		<Card.Header>
			<Card.Title><h1 class="text-xl">{m.auth_check_inbox()}</h1></Card.Title>
			<Card.Description>{m.auth_check_inbox_desc()}</Card.Description>
		</Card.Header>
		<Card.Footer class="text-muted-foreground justify-center text-sm">
			<a href="/login" class="text-foreground underline underline-offset-4">{m.auth_back_to_login()}</a>
		</Card.Footer>
	</Card.Root>
{:else}
	<Card.Root>
		<Card.Header>
			<Card.Title><h1 class="text-xl">{m.auth_signup_title()}</h1></Card.Title>
			<Card.Description>{m.auth_signup_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			<form method="POST" use:enhance novalidate>
				<Field.Group>
					{#if $message}
						<Alert variant="destructive">
							<AlertDescription>{$message}</AlertDescription>
						</Alert>
					{/if}

					<Field.Field data-invalid={$errors.name ? true : undefined}>
						<Field.Label for="name">{m.auth_name()}</Field.Label>
						<Input id="name" name="name" autocomplete="name" bind:value={$values.name} aria-invalid={$errors.name ? true : undefined} />
						<Field.Error errors={shown( $errors.name )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.email ? true : undefined}>
						<Field.Label for="email">{m.auth_email()}</Field.Label>
						<Input id="email" name="email" type="email" autocomplete="email" bind:value={$values.email} aria-invalid={$errors.email ? true : undefined} />
						<Field.Error errors={shown( $errors.email )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.password ? true : undefined}>
						<Field.Label for="password">{m.auth_password()}</Field.Label>
						<Input id="password" name="password" type="password" autocomplete="new-password" bind:value={$values.password} aria-invalid={$errors.password ? true : undefined} />
						<Field.Description>{m.auth_password_hint()}</Field.Description>
						<Field.Error errors={shown( $errors.password )} />
					</Field.Field>

					{#if MODULES.captcha && data.captcha}
						<CaptchaWidget bind:this={widget} provider={data.captcha.provider} siteKey={data.captcha.siteKey} action="signup" />
					{/if}

					<Button type="submit" class="w-full" disabled={$submitting}>
						{#if $submitting}
							<Spinner data-icon="inline-start" />
						{/if}
						{m.auth_signup_submit()}
					</Button>
					{#if data.legal.length}
						<p class="text-center text-xs text-balance text-muted-foreground">
							{m.auth_agree()}
							{#each data.legal as page, index ( page.href )}{#if index}{' '}{m.auth_and()}{' '}{/if}<a href={page.href} target="_blank" class="text-foreground underline underline-offset-4">{page.label}</a>{/each}.
						</p>
					{/if}
				</Field.Group>
			</form>
			{#if MODULES.social}<SocialButtons providers={data.social} />{/if}
		</Card.Content>
		<Card.Footer class="text-muted-foreground justify-center text-sm">
			{m.auth_have_account()}&nbsp;<a href="/login" class="text-foreground underline underline-offset-4">{m.auth_login_link()}</a>
		</Card.Footer>
	</Card.Root>
{/if}
