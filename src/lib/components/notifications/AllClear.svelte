<script lang="ts">
	import { m } from '#lib/paraglide/messages.js'

	/* ―― » The "all clear" moment ( the fundraiser app's ), shown when the last item in the
	        queue is handled: a check that draws itself in a ring, two soft pulses out. Plays
	        once on mount and then stays still. In tokens, so it follows the palette; with
	        reduced motion the check is simply there. `compact` for the bell's popover. */
	let { title = m.notif_all_clear(), subtitle = m.notif_all_clear_desc(), compact = false } : {
		title ?    : string
		subtitle ? : string
		compact ?  : boolean
	} = $props()
</script>

<div class={[ 'flex flex-col items-center text-center', compact ? 'gap-2 px-6 py-9' : 'gap-3 px-6 py-16' ]} role="status">
	<div class={[ 'badge relative', compact ? 'size-11' : 'size-14' ]}>
		<span class="pulse absolute inset-0 rounded-full border border-foreground/15"></span>
		<span class="pulse pulse-2 absolute inset-0 rounded-full border border-foreground/15"></span>
		<span class="relative flex size-full items-center justify-center rounded-full bg-primary text-primary-foreground">
			<svg class={[ 'check', compact ? 'size-5' : 'size-6' ]} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M20 6 9 17l-5-5" />
			</svg>
		</span>
	</div>
	<div class="flex flex-col gap-1">
		<p class={[ 'font-semibold tracking-tight', compact ? 'text-sm' : 'text-base' ]}>{title}</p>
		<p class={[ 'mx-auto max-w-xs leading-snug text-muted-foreground', compact ? 'text-xs' : 'text-sm' ]}>{subtitle}</p>
	</div>
</div>

<style>
	.badge {
		animation: badge-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.check path {
		stroke-dasharray: 30;
		stroke-dashoffset: 30;
		animation: draw 460ms cubic-bezier(0.65, 0, 0.35, 1) 160ms forwards;
	}

	.pulse {
		animation: pulse 900ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both;
	}

	.pulse-2 {
		animation-delay: 380ms;
	}

	@keyframes badge-in {
		from { opacity: 0; transform: translateY(6px) scale(0.9); }
		to { opacity: 1; transform: none; }
	}

	@keyframes draw {
		to { stroke-dashoffset: 0; }
	}

	@keyframes pulse {
		from { opacity: 0.7; transform: scale(1); }
		to { opacity: 0; transform: scale(1.9); }
	}

	@media (prefers-reduced-motion: reduce) {
		.badge { animation: none; }
		.check path { stroke-dashoffset: 0; animation: none; }
		.pulse { display: none; }
	}
</style>
