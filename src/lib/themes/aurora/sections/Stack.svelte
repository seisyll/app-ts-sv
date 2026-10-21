<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'

	let { stack } : { stack : HomeContent['stack'] } = $props()

	// Four floating glass layers, nearest last ( billing-app's platform diagram ).
	const layers = [
		{ z: 0, border: 'border-(--teal)/18', background: 'linear-gradient(135deg,rgba(86,231,209,0.05),rgba(255,255,255,0.01))' },
		{ z: 36, border: 'border-(--teal)/24', background: 'linear-gradient(135deg,rgba(86,231,209,0.06),rgba(255,255,255,0.012))' },
		{ z: 72, border: 'border-(--teal)/32', background: 'linear-gradient(135deg,rgba(86,231,209,0.08),rgba(255,255,255,0.015))' },
		{ z: 112, border: 'border-(--teal)/50 shadow-[0_0_40px_rgba(86,231,209,0.18)]', background: 'linear-gradient(135deg,rgba(86,231,209,0.14),rgba(8,12,14,0.6))' }
	]
</script>

<section class="relative border-t border-white/5.5">
	<div class="mx-auto max-w-310 px-5 py-[clamp(72px,11vh,130px)] sm:px-8 lg:px-18">
		<div class="text-center">
			<Eyebrow text={stack.eyebrow} centered />
			<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(36px,5.2vw,66px)] leading-none font-light tracking-[-0.02em] text-foreground">{stack.title}</h2>
		</div>

		<div use:reveal class="relative mt-[clamp(20px,4vh,40px)] flex h-[clamp(280px,38vw,420px)] items-center justify-center" aria-hidden="true">
			<div class="absolute size-[60%] blur-[20px]" style="background:radial-gradient(ellipse,rgba(86,231,209,0.16),transparent 70%);"></div>
			<div class="relative size-[clamp(220px,26vw,300px)] transform-3d" style="transform:rotateX(56deg) rotateZ(-34deg);">
				{#each layers as layer, index ( layer.z )}
					<div
						class="layer absolute inset-0 flex items-center justify-center rounded-[20px] border {layer.border}"
						style="background:{ layer.background };--z:{ layer.z }px;transform:translateZ({ layer.z }px);animation-delay:{ index * 0.45 }s;"
					>
						{#if index === layers.length - 1}
							<div class="size-6.5 rounded-full bg-(--teal) shadow-[0_0_24px_rgba(86,231,209,0.9)]"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<div class="mx-auto mt-[clamp(40px,6vh,70px)] grid max-w-250 grid-cols-1 items-center gap-8 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
			<div use:reveal>
				<h3 class="font-serif text-[clamp(26px,3vw,36px)] font-medium text-foreground">{stack.about}</h3>
				<p class="mt-4 text-[14.5px] leading-[1.74] text-muted-foreground">{stack.text}</p>
			</div>
			<ul use:reveal={{ delay: 90 }} class="flex flex-col gap-4">
				{#each stack.points as point ( point )}
					<li class="flex items-center gap-3.5">
						<span class="flex size-6.5 flex-[0_0_26px] items-center justify-center rounded-full border border-(--teal)/30 bg-(--teal)/10 text-(--teal)">
							<CheckIcon class="size-3.25" strokeWidth={2.4} aria-hidden="true" />
						</span>
						<span class="text-[14.5px] text-(--soft)">{point}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	/* The layers drift up and down, staggered. */
	@keyframes float {
		0%, 100% { transform: translateZ(calc(var(--z) - 13px)); }
		50% { transform: translateZ(calc(var(--z) + 13px)); }
	}

	.layer {
		animation: float 5.5s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.layer {
			animation: none;
		}
	}
</style>
