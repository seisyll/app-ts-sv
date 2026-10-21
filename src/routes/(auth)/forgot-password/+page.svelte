<script lang="ts">
	import MailCheckIcon from '@lucide/svelte/icons/mail-check'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { Alert, AlertDescription } from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Spinner } from '$lib/components/ui/spinner'
	import { forgotSchema } from '$lib/auth-schemas'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, { validators: valibot( forgotSchema ), resetForm: false } )
	const { form: values, errors, message, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.auth_forgot_title()}</title>
</svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title><h1 class="text-xl">{m.auth_forgot_title()}</h1></Card.Title>
		<Card.Description>{m.auth_forgot_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance novalidate>
			<Field.Group>
				{#if $message}
					<Alert>
						<MailCheckIcon />
						<AlertDescription>{$message}</AlertDescription>
					</Alert>
				{/if}

				<Field.Field data-invalid={$errors.email ? true : undefined}>
					<Field.Label for="email">{m.auth_email()}</Field.Label>
					<Input id="email" name="email" type="email" autocomplete="username" bind:value={$values.email} aria-invalid={$errors.email ? true : undefined} />
					<Field.Error errors={shown( $errors.email )} />
				</Field.Field>

				<Button type="submit" class="w-full" disabled={$submitting}>
					{#if $submitting}
						<Spinner data-icon="inline-start" />
					{/if}
					{m.auth_forgot_submit()}
				</Button>
			</Field.Group>
		</form>
	</Card.Content>
	<Card.Footer class="text-muted-foreground justify-center text-sm">
		<a href="/login" class="text-foreground underline underline-offset-4">{m.auth_back_to_login()}</a>
	</Card.Footer>
</Card.Root>
