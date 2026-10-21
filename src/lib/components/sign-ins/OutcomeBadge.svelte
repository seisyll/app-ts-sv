<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import { outcomeLabel } from '$lib/sign-ins'

	// A sign-in's outcome: signed in reads quiet, any refusal stands out.
	let { outcome } : { outcome : string } = $props()
</script>

<Badge variant={outcome === 'success' ? 'secondary' : 'destructive'}>{outcomeLabel( outcome )}</Badge>
