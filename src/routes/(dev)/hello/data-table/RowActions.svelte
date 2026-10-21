<script lang="ts">
	import { toast } from 'svelte-sonner'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis'
	import EyeIcon from '@lucide/svelte/icons/eye'
	import { Button } from '$lib/components/ui/button'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import { m } from '$lib/paraglide/messages'
	import type { Customer } from '../../demo-data'

	let { customer } : { customer : Customer } = $props()

	async function copyEmail() {
		await navigator.clipboard.writeText( customer.email ).catch( () => undefined )
		toast.success( m.demo_table_copied( { email: customer.email } ) )
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child( { props } )}
			<Button {...props} variant="ghost" size="icon-sm" aria-label={m.demo_table_actions( { name: customer.name } )}>
				<EllipsisIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Group>
			<DropdownMenu.Item onclick={() => toast( customer.name, { description: customer.id } )}>
				<EyeIcon />
				{m.demo_table_view()}
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={copyEmail}>
				<CopyIcon />
				{m.demo_table_copy_email()}
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
