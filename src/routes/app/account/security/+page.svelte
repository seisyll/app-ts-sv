<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { Checkbox } from '#lib/components/ui/checkbox/index.js'
	import * as Field from '#lib/components/ui/field/index.js'
	import { Input } from '#lib/components/ui/input/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { SignInList } from '#lib/components/sign-ins/index.js'
	import { passwordSchema } from '#lib/auth-schemas.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( passwordSchema ),
		onUpdated : ( { form: updated } ) => {
			if ( updated.message )
				( updated.valid ? toast.success : toast.error )( updated.message )
		}
	} )
	const { form: values, errors, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.app_nav_security()} · {data.tenant.name}</title>
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{m.app_nav_security()}</h1>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>{m.app_password_title()}</Card.Title>
		<Card.Description>{m.app_password_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance novalidate>
			<Field.Group>
				<Field.Field data-invalid={$errors.currentPassword ? true : undefined}>
					<Field.Label for="currentPassword">{m.app_current_password()}</Field.Label>
					<Input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" bind:value={$values.currentPassword} aria-invalid={$errors.currentPassword ? true : undefined} />
					<Field.Error errors={shown( $errors.currentPassword )} />
				</Field.Field>
				<Field.Field data-invalid={$errors.newPassword ? true : undefined}>
					<Field.Label for="newPassword">{m.app_new_password()}</Field.Label>
					<Input id="newPassword" name="newPassword" type="password" autocomplete="new-password" bind:value={$values.newPassword} aria-invalid={$errors.newPassword ? true : undefined} />
					<Field.Description>{m.auth_password_hint()}</Field.Description>
					<Field.Error errors={shown( $errors.newPassword )} />
				</Field.Field>
				<Field.Field data-invalid={$errors.confirmPassword ? true : undefined}>
					<Field.Label for="confirmPassword">{m.app_confirm_password()}</Field.Label>
					<Input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" bind:value={$values.confirmPassword} aria-invalid={$errors.confirmPassword ? true : undefined} />
					<Field.Error errors={shown( $errors.confirmPassword )} />
				</Field.Field>
				<Field.Field orientation="horizontal">
					<Checkbox id="revokeOtherSessions" name="revokeOtherSessions" bind:checked={$values.revokeOtherSessions} />
					<Field.Label for="revokeOtherSessions" class="font-normal">{m.app_revoke_sessions()}</Field.Label>
				</Field.Field>
				<Button type="submit" class="self-start" disabled={$submitting}>
					{#if $submitting}
						<Spinner data-icon="inline-start" />
					{/if}
					{m.app_change_password()}
				</Button>
			</Field.Group>
		</form>
	</Card.Content>
</Card.Root>

{#if data.signIns}
	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title>{m.signins_mine()}</Card.Title>
			<Card.Description>{m.signins_mine_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<SignInList entries={data.signIns} />
		</Card.Content>
	</Card.Root>
{/if}
