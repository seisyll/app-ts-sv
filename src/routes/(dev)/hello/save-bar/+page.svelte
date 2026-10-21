<script lang="ts">
	import { toast } from 'svelte-sonner'
	import EyeIcon from '@lucide/svelte/icons/eye'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { Draft, SaveBar, SaveBarAction } from '$lib/components/save-bar'
	import { m } from '$lib/paraglide/messages'

	type Mode = 'show' | 'dirty' | 'always'

	const settings = new Draft( {
		siteName: 'Acme',
		email   : 'support@acme.test',
		notify  : true
	} )

	let mode = $state<Mode>( 'show' )
	let invalid = $state( false )
	let failSaves = $state( false )
	let saving = $state( false )

	// Fake round-trip so the spinner, the locked actions and the error path are visible.
	async function save() {
		saving = true

		try {
			await new Promise( ( resolve ) => setTimeout( resolve, 900 ) )

			if ( failSaves ) throw new Error( 'Simulated failure' )

			settings.commit()
			toast.success( m.demo_save_ok() )
		} catch {
			toast.error( m.demo_save_fail() )
		} finally {
			saving = false
		}
	}

	const modes : { value : Mode, label : string }[] = [
		{ value: 'show', label: m.demo_mode_show() },
		{ value: 'dirty', label: m.demo_mode_dirty() },
		{ value: 'always', label: m.demo_mode_always() }
	]
</script>

<svelte:head>
	<title>SaveBar · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">SaveBar</h1>
	<p class="text-muted-foreground text-sm">{m.demo_savebar_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_controls()}</Card.Title>
	</Card.Header>
	<Card.Content>
		<Field.Group>
			<Field.Field>
				<Field.Label>{m.demo_mode()}</Field.Label>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					spacing={1}
					class="flex-wrap"
					aria-label={m.demo_mode()}
					bind:value={() => mode, ( value ) => value && ( mode = value as Mode )}
				>
					{#each modes as item ( item.value )}
						<ToggleGroup.Item value={item.value}>{item.label}</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</Field.Field>

			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="demo-invalid">{m.demo_invalid()}</Field.Label>
					<Field.Description>{m.demo_invalid_desc()}</Field.Description>
				</Field.Content>
				<Switch id="demo-invalid" bind:checked={invalid} />
			</Field.Field>

			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="demo-fail">{m.demo_fail()}</Field.Label>
					<Field.Description>{m.demo_fail_desc()}</Field.Description>
				</Field.Content>
				<Switch id="demo-fail" bind:checked={failSaves} />
			</Field.Field>
		</Field.Group>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_form()}</Card.Title>
		<Card.Description>{m.demo_form_desc()}</Card.Description>
		<Card.Action>
			<Badge variant={settings.dirty ? 'default' : 'secondary'}>
				{settings.dirty ? m.demo_state_dirty() : m.demo_state_clean()}
			</Badge>
		</Card.Action>
	</Card.Header>
	<Card.Content>
		<Field.Group>
			<Field.Field>
				<Field.Label for="demo-site">{m.demo_site_name()}</Field.Label>
				<Input id="demo-site" bind:value={settings.value.siteName} />
			</Field.Field>

			<Field.Field>
				<Field.Label for="demo-email">{m.demo_email()}</Field.Label>
				<Input id="demo-email" type="email" bind:value={settings.value.email} />
			</Field.Field>

			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="demo-notify">{m.demo_notify()}</Field.Label>
					<Field.Description>{m.demo_notify_desc()}</Field.Description>
				</Field.Content>
				<Switch id="demo-notify" bind:checked={settings.value.notify} />
			</Field.Field>
		</Field.Group>
	</Card.Content>
	<Card.Footer>
		<Button href="/hello" variant="link" class="px-0">{m.demo_leave()}</Button>
	</Card.Footer>
</Card.Root>

<SaveBar
	show={mode === 'show' ? settings.dirty : undefined}
	dirty={mode === 'dirty' ? settings.dirty : undefined}
	{saving}
	disabled={invalid}
	onsave={save}
	ondiscard={() => settings.reset()}
>
	<SaveBarAction icon={EyeIcon} label={m.demo_preview()} onclick={() => toast.info( m.demo_preview_toast() )} />
</SaveBar>
