<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { outcomeLabel } from '#lib/sign-ins.js'

	// A sign-in's outcome: signed in reads quiet, any refusal stands out.
	let { outcome } : { outcome : string } = $props()
</script>

<Badge variant={outcome === 'success' ? 'secondary' : 'destructive'}>{outcomeLabel( outcome )}</Badge>
