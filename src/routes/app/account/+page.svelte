<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { invalidateAll } from '$app/navigation'
	import { AvatarField } from '#lib/components/avatar/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import * as Field from '#lib/components/ui/field/index.js'
	import { Input } from '#lib/components/ui/input/index.js'
	import { SaveBar } from '#lib/components/save-bar/index.js'
	import { ConnectedAccounts } from '#lib/components/social/index.js'
	import { profileSchema } from '#lib/auth-schemas.js'
	import { http } from '#lib/http.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data, form: action } = $props()

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

	// The sidebar shows the picture too: reload after a change.
	async function uploadAvatar( picture : Blob ) {
		const body = new FormData()

		body.set( 'file', picture, 'avatar.webp' )
		await http.post( '/api/account/avatar', body )
		await invalidateAll()
	}

	async function removeAvatar() {
		await http.delete( '/api/account/avatar' )
		await invalidateAll()
	}
</script>

<svelte:head>
	<title>{m.app_nav_profile()} · {data.tenant.name}</title>
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{m.app_nav_profile()}</h1>

{#if MODULES.media}
	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title>{m.avatar_title()}</Card.Title>
			<Card.Description>{m.avatar_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<AvatarField name={data.user.name} image={data.user.image ?? null} uploaded={data.avatarUploaded} upload={uploadAvatar} remove={removeAvatar} />
		</Card.Content>
	</Card.Root>
{/if}

<form method="POST" action="?/profile" use:enhance novalidate>
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

{#if MODULES.social}
	<ConnectedAccounts accounts={data.accounts} canDisconnect={data.canDisconnect} message={action?.social ?? ( data.linkError ? m.social_link_failed() : null )} />
{/if}
