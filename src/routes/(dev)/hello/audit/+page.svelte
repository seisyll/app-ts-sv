<script lang="ts">
	import { AuditEntry } from '$lib/components/audit'
	import * as Card from '$lib/components/ui/card'
	import { m } from '$lib/paraglide/messages'

	// Entries as the trail stores them: an action, names as they were, what changed.
	const entries = [
		{ action: 'user.role', actorName: 'Ada Lovelace', target: 'Grace Hopper <grace@example.test>', changes: { role: [ 'member', 'admin' ] } },
		{ action: 'appearance.update', actorName: 'Ada Lovelace', target: null, changes: { palette: [ 'neutral', 'teal' ], allowUserOverride: [ true, false ] } },
		{ action: 'captcha.settings', actorName: 'Ada Lovelace', target: null, changes: { enabled: [ false, true ], provider: [ 'turnstile', 'hcaptcha' ], secret: null } },
		{ action: 'media.publish', actorName: 'Grace Hopper', target: 'Harbour.jpg', changes: null },
		{ action: 'user.signup', actorName: 'Alan Turing', target: 'Alan Turing <alan@example.test>', changes: null },
		{ action: 'report.archive', actorName: 'Grace Hopper', target: 'Q3', changes: null }
	] as const
</script>

<svelte:head>
	<title>{m.audit_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.audit_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_audit_desc()}</p>
</div>

<Card.Root>
	<Card.Content class="flex flex-col divide-y">
		{#each entries as entry, index ( index )}
			<div class="py-3 first:pt-0 last:pb-0"><AuditEntry entry={{ ...entry, changes: entry.changes as never }} /></div>
		{/each}
	</Card.Content>
</Card.Root>
