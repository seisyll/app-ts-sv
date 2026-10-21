<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { SaveBar } from '$lib/components/save-bar'
	import { profileSchema } from '$lib/auth-schemas'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( profileSchema ),
		resetForm : false,
		// The layout shows the name too: reload it after a save.
		invalidateAll: true,
		onUpdated  : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.app_nav_profile()} · {data.tenant.name}</title>
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{m.app_nav_profile()}</h1>

<form method="POST" use:enhance novalidate>
	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title>{m.app_profile_title()}</Card.Title>
			<Card.Description>{m.app_profile_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<Field.Group>
				<Field.Field data-invalid={$errors.name ? true : undefined}>
					<Field.Label for="name">{m.auth_name()}</Field.Label>
					<Input id="name" name="name" autocomplete="name" bind:value={$values.name} aria-invalid={$errors.name ? true : undefined} />
					<Field.Error errors={shown( $errors.name )} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">{m.auth_email()}</Field.Label>
					<Input id="email" value={data.user.email} disabled />
					<Field.Description>{m.app_email_fixed()}</Field.Description>
				</Field.Field>
			</Field.Group>
		</Card.Content>
	</Card.Root>

	<SaveBar show={form.isTainted( $tainted )} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
</form>
