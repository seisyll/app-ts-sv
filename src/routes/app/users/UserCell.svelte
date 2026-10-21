<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Badge } from '$lib/components/ui/badge'
	import { initials } from '$lib/format'
	import { m } from '$lib/paraglide/messages'
	import type { UserRow } from '$lib/users'

	let { user, you } : { user : UserRow, you : boolean } = $props()
</script>

<div class="flex items-center gap-3">
	<Avatar.Root class="size-8">
		{#if user.image}
			<Avatar.Image src={user.image} alt="" />
		{/if}
		<Avatar.Fallback class="text-xs font-medium">{initials( user.name )}</Avatar.Fallback>
	</Avatar.Root>
	<span class="truncate font-medium">{user.name}</span>
	{#if you}
		<Badge variant="outline">{m.users_you()}</Badge>
	{/if}
</div>
