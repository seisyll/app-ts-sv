<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'
	import Lines from '../Lines.svelte'
	import Globe from './Globe.svelte'

	let { hero } : { hero : HomeContent['hero'] } = $props()

	const grid = 'background-image:linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px);background-size:62px 62px;'
</script>

<section class="relative mx-auto max-w-335 px-5 py-[clamp(60px,10vh,130px)] sm:px-8 lg:px-18">
	<div
		class="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 opacity-60"
		style="{ grid }mask-image:radial-gradient(circle at 50% 42%,black,transparent 64%);"
	></div>

	<div class="relative grid grid-cols-1 items-center gap-10 md:grid-cols-[1.05fr_0.95fr] lg:gap-14">
		<div>
			<Eyebrow text={hero.eyebrow} centered />
			<h1 use:reveal={{ delay: 70 }} class="mt-5 font-serif text-[clamp(48px,7.4vw,98px)] leading-[0.96] font-light tracking-[-0.02em] text-foreground">
				<Lines text={hero.title} accent={hero.accent} />
			</h1>
			<p use:reveal={{ delay: 130 }} class="mt-7 max-w-113 text-[clamp(14px,1.05vw,16px)] leading-[1.72] text-muted-foreground">{hero.lead}</p>
			<div use:reveal={{ delay: 190 }} class="mt-9 flex flex-wrap gap-3.25">
				<a href={hero.primary.href} class="inline-flex items-center rounded-full bg-foreground px-6 py-3.5 text-[13px] font-semibold text-(--ink) transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">{hero.primary.label}</a>
				<a href={hero.secondary.href} class="inline-flex items-center rounded-full border border-white/12 bg-white/4 px-6 py-3.5 text-[13px] font-medium text-(--soft) transition-all duration-300 hover:border-white/22 hover:bg-white/8">{hero.secondary.label}</a>
			</div>
		</div>
		<div class="relative flex items-center justify-center">
			<div
				class="pointer-events-none absolute top-1/2 left-1/2 size-[min(840px,140%)] -translate-1/2"
				style="background:radial-gradient(circle,rgba(42,128,116,0.34),rgba(42,128,116,0.12) 36%,transparent 64%);"
			></div>
			<div class="relative w-full"><Globe /></div>
		</div>
	</div>
</section>
