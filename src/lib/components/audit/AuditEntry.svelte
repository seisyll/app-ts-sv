<script lang="ts">
	import { auditChangeLines, auditSentence, type AuditRow } from '#lib/audit.js'

	// One entry of the trail: the sentence in the reader's language, then what changed —
	// "Role: member → admin", "Secret key: changed" — one line each.
	let { entry } : { entry : Pick<AuditRow, 'action' | 'actorName' | 'target' | 'changes'> } = $props()

	const lines = $derived( auditChangeLines( entry.changes ) )
</script>

<div class="flex min-w-0 flex-col gap-1">
	<span class="text-sm">{auditSentence( entry )}</span>
	{#if lines.length}
		<ul class="flex flex-wrap gap-1.5">
			{#each lines as line ( line )}
				<li class="rounded-[calc(var(--radius)*0.5)] bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{line}</li>
			{/each}
		</ul>
	{/if}
</div>
