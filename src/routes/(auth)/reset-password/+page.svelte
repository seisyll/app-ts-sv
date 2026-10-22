<script lang="ts">
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import * as Field from '#lib/components/ui/field/index.js'
	import { Input } from '#lib/components/ui/input/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { resetSchema } from '#lib/auth-schemas.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, { validators: valibot( resetSchema ) } )
	const { form: values, errors, message, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )

	const title = $derived( data.invite ? m.auth_invite_title() : m.auth_reset_title() )
</script>

<svelte:head>
	<title>{data.valid ? title : m.auth_link_expired_title()}</title>
</svelte:head>

<Card.Root>
	{#if data.valid}
		<Card.Header>
			<Card.Title><h1 class="text-xl">{title}</h1></Card.Title>
			<Card.Description>{data.invite ? m.auth_invite_desc( { name: data.name } ) : m.auth_reset_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" use:enhance novalidate>
				<input type="hidden" name="token" value={$values.token} />
				<Field.Group>
					{#if $message}
						<Alert variant="destructive">
							<AlertDescription>{$message}</AlertDescription>
						</Alert>
					{/if}

					<Field.Field data-invalid={$errors.newPassword ? true : undefined}>
						<Field.Label for="newPassword">{m.auth_new_password()}</Field.Label>
						<Input id="newPassword" name="newPassword" type="password" autocomplete="new-password" bind:value={$values.newPassword} aria-invalid={$errors.newPassword ? true : undefined} />
						<Field.Description>{m.auth_password_hint()}</Field.Description>
						<Field.Error errors={shown( $errors.newPassword )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.confirmPassword ? true : undefined}>
						<Field.Label for="confirmPassword">{m.auth_confirm_password()}</Field.Label>
						<Input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" bind:value={$values.confirmPassword} aria-invalid={$errors.confirmPassword ? true : undefined} />
						<Field.Error errors={shown( $errors.confirmPassword )} />
					</Field.Field>

					<Button type="submit" class="w-full" disabled={$submitting}>
						{#if $submitting}
							<Spinner data-icon="inline-start" />
						{/if}
						{data.invite ? m.auth_invite_submit() : m.auth_reset_submit()}
					</Button>
				</Field.Group>
			</form>
		</Card.Content>
	{:else}
		<Card.Header>
			<Card.Title><h1 class="text-xl">{m.auth_link_expired_title()}</h1></Card.Title>
			<Card.Description>{m.auth_link_expired()}</Card.Description>
		</Card.Header>
		<Card.Footer class="gap-2">
			<Button href="/forgot-password">{m.auth_forgot_again()}</Button>
			<Button href="/login" variant="outline">{m.auth_back_to_login()}</Button>
		</Card.Footer>
	{/if}
</Card.Root>
