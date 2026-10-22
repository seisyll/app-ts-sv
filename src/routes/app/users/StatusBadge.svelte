<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { m } from '#lib/paraglide/messages.js'

	let { banned, invited = false } : { banned : boolean, invited ?: boolean } = $props()
</script>

{#if banned}
	<Badge variant="destructive">{m.users_status_banned()}</Badge>
{:else if invited}
	<Badge variant="outline">{m.users_status_invited()}</Badge>
{:else}
	<Badge variant="secondary">{m.users_status_active()}</Badge>
{/if}
