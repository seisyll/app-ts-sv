<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import { date } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import { deviceLabel, methodLabel, type SignInRow } from '#lib/sign-ins.js'
	import OutcomeBadge from './OutcomeBadge.svelte'

	// A person's latest sign-ins, theirs and attempts on their email alike: the device, how,
	// from where, when, and how it went — enough to spot one that wasn't them.
	let { entries } : { entries : SignInRow[] } = $props()
</script>

{#if entries.length}
	<ul class="flex flex-col divide-y">
		{#each entries as entry ( entry.id )}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
				<MonitorSmartphoneIcon class="size-4 shrink-0 text-muted-foreground" />
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="truncate text-sm font-medium">{deviceLabel( entry.userAgent )}</span>
					<span class="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
						<KeyRoundIcon class="size-3" />{methodLabel( entry.method )} · {entry.ip ?? '—'} · {date( entry.at )}
					</span>
				</div>
				<OutcomeBadge outcome={entry.outcome} />
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-sm text-muted-foreground">{m.signins_none()}</p>
{/if}
