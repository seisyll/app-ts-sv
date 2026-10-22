<script lang="ts">
	import * as Avatar from '#lib/components/ui/avatar/index.js'
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { initials } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import type { UserRow } from '#lib/users.js'

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
