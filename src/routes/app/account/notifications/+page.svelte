<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { enhance } from '$app/forms'
	import { SaveBar } from '$lib/components/save-bar'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Switch } from '$lib/components/ui/switch'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	const stored = () => Object.fromEntries( data.preferences.map( ( preference ) => [ preference.type, preference.enabled ] ) )

	// svelte-ignore state_referenced_locally
	let enabled = $state<Record<string, boolean>>( stored() )
	let saving = $state( false )

	const dirty = $derived( data.preferences.some( ( preference ) => enabled[ preference.type ] !== preference.enabled ) )
</script>

<svelte:head>
	<title>{m.notif_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.notif_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.notif_prefs_desc()}</p>
</div>

<!-- A real form post: works without JavaScript; enhanced, it keeps the page and toasts. -->
<form
	method="POST"
	use:enhance={() => {
		saving = true

		return async( { result, update } ) => {
			saving = false

			if ( result.type === 'success' )
				toast.success( m.notif_prefs_saved() )

			await update( { reset: false } )
		}
	}}
>
	<Card.Root class="max-w-xl">
		<Card.Content>
			<Field.Group>
				{#each data.preferences as preference ( preference.type )}
					<Field.Field orientation="horizontal">
						<Field.Content>
							<Field.Label for="pref-{preference.type}">{preference.label}</Field.Label>
							<Field.Description>{preference.description}</Field.Description>
						</Field.Content>
						<Switch id="pref-{preference.type}" name={preference.type} bind:checked={enabled[ preference.type ]} />
					</Field.Field>
				{/each}
			</Field.Group>
		</Card.Content>
	</Card.Root>

	<SaveBar show={dirty} {saving} saveType="submit" ondiscard={() => ( enabled = stored() )} />
</form>
