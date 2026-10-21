<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'
	import Lines from '../Lines.svelte'

	let { features } : { features : HomeContent['features'] } = $props()
</script>

<section id="features" class="relative mx-auto max-w-310 scroll-mt-20 px-5 py-[clamp(72px,11vh,132px)] sm:px-8 lg:px-18">
	<div class="max-w-170">
		<Eyebrow text={features.eyebrow} />
		<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(34px,4.8vw,60px)] leading-[1.02] font-light tracking-[-0.018em] text-foreground">
			<Lines text={features.title} />
		</h2>
		<p use:reveal={{ delay: 110 }} class="mt-5.5 max-w-130 text-[clamp(14px,1vw,15.5px)] leading-[1.72] text-muted-foreground">{features.lead}</p>
	</div>

	<div class="mt-[clamp(40px,6vh,64px)] grid grid-cols-1 gap-4.5 md:grid-cols-2 lg:grid-cols-3">
		{#each features.items as item, index ( item.title )}
			<div
				use:reveal={{ delay: ( index % 3 ) * 70 }}
				class="rounded-2xl border border-white/7 bg-linear-to-b from-white/[0.035] to-white/[0.008] px-7 py-7.5 transition-all duration-300 hover:-translate-y-1 hover:border-(--teal)/30"
			>
				<div class="flex size-11.5 items-center justify-center rounded-xl border border-(--teal)/18 bg-(--teal)/8 text-(--teal)">
					<item.icon class="size-5.5" strokeWidth={1.4} aria-hidden="true" />
				</div>
				<h3 class="mt-5.5 font-serif text-[24px] font-medium text-foreground">{item.title}</h3>
				<p class="mt-3 text-[14px] leading-[1.66] text-muted-foreground">{item.text}</p>
			</div>
		{/each}
	</div>
</section>
