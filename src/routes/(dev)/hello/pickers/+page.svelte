<script lang="ts">
	import { RemotePicker, type PickerOption } from '$lib/components/pickers'
	import * as Card from '$lib/components/ui/card'
	import { Label } from '$lib/components/ui/label'
	import { m } from '$lib/paraglide/messages'
	import type { Customer } from '../../demo-data'

	// RemotePicker over the mock customers endpoint ( 137 rows, searched and paged there ).
	const toOption = ( customer : Customer ) : PickerOption => ( { value: customer.id, label: customer.name, hint: customer.email } )

	let owner = $state<string | null>( null )
	let ownerName = $state( '' )
	let team = $state<string[]>( [] )
	let chosen = $state<PickerOption[]>( [] )
</script>

<svelte:head>
	<title>RemotePicker · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">RemotePicker</h1>
	<p class="text-sm text-muted-foreground">{m.demo_picker_desc()}</p>
</div>

<div class="grid gap-6 lg:grid-cols-2">
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.demo_picker_single()}</Card.Title>
			<Card.Description>{m.demo_picker_single_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<Label for="demo-owner">{m.demo_picker_owner()}</Label>
			<RemotePicker id="demo-owner" path="/api/hello/customers" {toOption} bind:value={owner} bind:label={ownerName} clearLabel={m.demo_picker_nobody()} />
			<p class="text-xs text-muted-foreground">value: <code>{owner ?? 'null'}</code> · label: <code>{ownerName || '—'}</code></p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.demo_picker_multiple()}</Card.Title>
			<Card.Description>{m.demo_picker_multiple_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<Label for="demo-team">{m.demo_picker_team()}</Label>
			<RemotePicker id="demo-team" path="/api/hello/customers" {toOption} multiple bind:values={team} bind:selected={chosen} params={{ 'f.plan': [ 'pro', 'team' ] }} />
			<p class="text-xs text-muted-foreground">values: <code>{JSON.stringify( team )}</code></p>
		</Card.Content>
	</Card.Root>
</div>
