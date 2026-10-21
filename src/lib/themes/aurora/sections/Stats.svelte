<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime'
	import type { HomeContent } from '../../contract'
	import { countUp, reveal } from '../actions'

	let { stats } : { stats : HomeContent['stats'] } = $props()

	// The final value is what the server renders; countUp animates towards it.
	const shown = ( stat : HomeContent['stats'][number] ) => new Intl.NumberFormat( getLocale(), { minimumFractionDigits: stat.decimals ?? 0, maximumFractionDigits: stat.decimals ?? 0 } ).format( stat.value ) + ( stat.suffix ?? '' )
</script>

<section class="border-y border-white/5.5 bg-white/[0.012]">
	<dl class="mx-auto grid max-w-310 grid-cols-2 gap-10 px-5 py-[clamp(54px,8vh,86px)] text-center sm:px-8 md:grid-cols-4 lg:px-18">
		{#each stats as stat, index ( stat.label )}
			<div use:reveal={{ delay: index * 80 }} class="flex flex-col-reverse">
				<dt class="mt-3 font-mono text-[11px] tracking-[0.2em] text-(--faint) uppercase">{stat.label}</dt>
				<dd class="font-serif text-[clamp(42px,5.5vw,66px)] leading-none font-light text-foreground tabular-nums">
					<span use:countUp={{ to: stat.value, decimals: stat.decimals, suffix: stat.suffix }}>{shown( stat )}</span>
				</dd>
			</div>
		{/each}
	</dl>
</section>
