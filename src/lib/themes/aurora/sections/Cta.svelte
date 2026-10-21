<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'
	import Lines from '../Lines.svelte'

	let { cta } : { cta : HomeContent['cta'] } = $props()
</script>

<section class="relative overflow-hidden border-t border-white/5.5">
	<div class="pointer-events-none absolute inset-0" style="background:radial-gradient(circle at 50% 120%,rgba(42,128,116,0.32),transparent 60%);"></div>
	<div
		class="pointer-events-none absolute inset-0 opacity-50"
		style="background-image:linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px);background-size:62px 62px;mask-image:radial-gradient(circle at 50% 90%,black,transparent 70%);"
	></div>

	<div class="relative mx-auto max-w-190 px-5 py-[clamp(80px,13vh,150px)] text-center sm:px-8 lg:px-18">
		<Eyebrow text={cta.eyebrow} centered />
		<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(40px,6.2vw,82px)] leading-[0.98] font-light tracking-[-0.02em] text-foreground">
			<Lines text={cta.title} accent={cta.accent} />
		</h2>
		<p use:reveal={{ delay: 120 }} class="mx-auto mt-6 max-w-115 text-[clamp(14px,1.05vw,16px)] leading-[1.7] text-muted-foreground">{cta.lead}</p>
		<div use:reveal={{ delay: 180 }} class="mt-9 flex flex-wrap justify-center gap-3.25">
			<a href={cta.primary.href} class="inline-flex items-center rounded-full bg-foreground px-7 py-3.5 text-[13.5px] font-semibold text-(--ink) transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">{cta.primary.label}</a>
			<a href={cta.secondary.href} class="inline-flex items-center rounded-full border border-white/12 bg-white/4 px-7 py-3.5 text-[13.5px] font-medium text-(--soft) transition-all duration-300 hover:border-white/22 hover:bg-white/8">{cta.secondary.label}</a>
		</div>
		<p use:reveal={{ delay: 220 }} class="mt-4.5 font-mono text-[11px] tracking-[0.06em] text-(--faint)">{cta.note}</p>
	</div>
</section>
