<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import { m } from '$lib/paraglide/messages'

	let { banned } : { banned : boolean } = $props()
</script>

{#if banned}
	<Badge variant="destructive">{m.users_status_banned()}</Badge>
{:else}
	<Badge variant="secondary">{m.users_status_active()}</Badge>
{/if}
