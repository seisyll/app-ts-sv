<script lang="ts">
	import UserPlusIcon from '@lucide/svelte/icons/user-plus'
	import { Button } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Select from '$lib/components/ui/select'
	import { Spinner } from '$lib/components/ui/spinner'
	import { apiForm } from '$lib/forms'
	import { http } from '$lib/http'
	import { m } from '$lib/paraglide/messages'
	import { DEFAULT_ROLE, type RoleName } from '$lib/permissions'
	import { newUserSchema, ROLE_NAMES, roleLabel } from '$lib/users'

	let { onadded } : { onadded : () => void } = $props()

	let open = $state( false )

	const blank = { name: '', email: '', password: '', role: DEFAULT_ROLE as RoleName }
	const form = apiForm( newUserSchema, {
		id       : 'add-user',
		initial  : blank,
		submit   : ( values ) => http.post( '/api/users', values ),
		success  : ( values ) => m.users_added( { name: values.name } ),
		onSuccess: () => {
			open = false
			onadded()
		}
	} )
	const { form: values, errors, submitting, enhance } = form

	// Field.Error takes [ { message } ]; superforms holds string[].
	const shown = ( messages ?: string[] ) => messages?.map( ( message ) => ( { message } ) )
</script>

<!-- Starts blank each time it opens. -->
<Dialog.Root bind:open onOpenChange={( next ) => next && form.reset( { data: blank, newState: blank } )}>
	<Dialog.Trigger>
		{#snippet child( { props } )}
			<Button {...props} size="sm">
				<UserPlusIcon data-icon="inline-start" />
				{m.users_add()}
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-md">
		<form method="POST" use:enhance novalidate class="flex flex-col gap-6">
			<Dialog.Header>
				<Dialog.Title>{m.users_add()}</Dialog.Title>
				<Dialog.Description>{m.users_add_desc()}</Dialog.Description>
			</Dialog.Header>

			<Field.Group>
				<Field.Field data-invalid={$errors.name ? true : undefined}>
					<Field.Label for="add-user-name">{m.users_name()}</Field.Label>
					<Input id="add-user-name" autocomplete="off" bind:value={$values.name} aria-invalid={$errors.name ? true : undefined} />
					<Field.Error errors={shown( $errors.name )} />
				</Field.Field>
				<Field.Field data-invalid={$errors.email ? true : undefined}>
					<Field.Label for="add-user-email">{m.users_email()}</Field.Label>
					<Input id="add-user-email" type="email" autocomplete="off" bind:value={$values.email} aria-invalid={$errors.email ? true : undefined} />
					<Field.Error errors={shown( $errors.email )} />
				</Field.Field>
				<Field.Field data-invalid={$errors.password ? true : undefined}>
					<Field.Label for="add-user-password">{m.users_password()}</Field.Label>
					<Input id="add-user-password" type="password" autocomplete="new-password" bind:value={$values.password} aria-invalid={$errors.password ? true : undefined} />
					<Field.Error errors={shown( $errors.password )} />
				</Field.Field>
				<Field.Field data-invalid={$errors.role ? true : undefined}>
					<Field.Label for="add-user-role">{m.users_role()}</Field.Label>
					<Select.Root type="single" bind:value={() => $values.role, ( value ) => ( $values.role = value as RoleName )}>
						<Select.Trigger id="add-user-role" class="w-full">{roleLabel( $values.role )}</Select.Trigger>
						<Select.Content>
							{#each ROLE_NAMES as role ( role )}
								<Select.Item value={role} label={roleLabel( role )}>{roleLabel( role )}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Field.Error errors={shown( $errors.role )} />
				</Field.Field>
			</Field.Group>

			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child( { props } )}
						<Button {...props} variant="outline">{m.table_cancel()}</Button>
					{/snippet}
				</Dialog.Close>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Spinner data-icon="inline-start" />{/if}
					{m.users_add()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
