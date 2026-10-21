<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'
	import Lines from '../Lines.svelte'

	let { steps } : { steps : HomeContent['steps'] } = $props()
</script>

<section id="how" class="relative scroll-mt-20 border-t border-white/5.5">
	<div class="mx-auto grid max-w-310 grid-cols-1 items-start gap-10 px-5 py-[clamp(72px,11vh,130px)] sm:px-8 md:grid-cols-[1.05fr_0.95fr] lg:gap-18 lg:px-18">
		<div>
			<Eyebrow text={steps.eyebrow} />
			<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(34px,4.8vw,58px)] leading-none font-light tracking-[-0.018em] text-foreground">
				<Lines text={steps.title} />
			</h2>
			<p use:reveal={{ delay: 110 }} class="mt-5.5 max-w-105 text-[clamp(14px,1vw,15.5px)] leading-[1.74] text-muted-foreground">{steps.lead}</p>
			<a use:reveal={{ delay: 150 }} href={steps.link.href} class="mt-7.5 inline-flex items-center gap-2.25 font-mono text-[13px] tracking-[0.04em] text-(--teal-soft) uppercase transition-all hover:gap-3.5">
				{steps.link.label} <span aria-hidden="true">→</span>
			</a>
		</div>

		<!-- The glowing rail and dots are decoration; the list is the content. -->
		<div use:reveal={{ delay: 100 }} class="relative">
			<div class="absolute top-2.5 bottom-2.5 left-2.75 w-px bg-linear-to-b from-(--teal)/55 to-(--teal)/5" aria-hidden="true"></div>
			<ol>
				{#each steps.items as step ( step.title )}
					<li class="relative flex gap-5.5 pb-6.5 last:pb-0">
						<div class="flex flex-[0_0_24px] justify-center pt-1.5" aria-hidden="true">
							<div class="size-2.75 rounded-full bg-(--teal) shadow-[0_0_14px_rgba(86,231,209,0.85)]"></div>
						</div>
						<div class="flex-1 rounded-[14px] border border-white/8 bg-linear-to-b from-white/4 to-white/1 px-6 py-5.5">
							<p class="font-mono text-[10px] tracking-[0.22em] text-(--teal-dim)/70">{step.tag}</p>
							<h3 class="mt-2 font-serif text-[23px] font-medium text-foreground">{step.title}</h3>
							<p class="mt-2.25 text-[13.5px] leading-[1.6] text-muted-foreground">{step.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>
