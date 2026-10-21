<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'

	let { faq } : { faq : HomeContent['faq'] } = $props()
</script>

<section id="faq" class="scroll-mt-20 border-t border-white/5.5">
	<div class="mx-auto max-w-215 px-5 py-[clamp(72px,11vh,130px)] sm:px-8 lg:px-18">
		<div class="text-center">
			<Eyebrow text={faq.eyebrow} centered />
			<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(34px,5vw,62px)] leading-none font-light tracking-[-0.02em] text-foreground">{faq.title}</h2>
		</div>

		<!-- Native accordion: <details name> keeps one answer open, works without JavaScript. -->
		<div use:reveal={{ delay: 100 }} class="mt-[clamp(36px,5vh,52px)] border-t border-white/8">
			{#each faq.items as item, index ( item.question )}
				<details name="aurora-faq" open={index === 0} class="group border-b border-white/8">
					<summary class="flex cursor-pointer list-none items-center justify-between gap-5 px-1 py-6 [&::-webkit-details-marker]:hidden">
						<span class="font-serif text-[clamp(19px,2.2vw,24px)] font-medium text-foreground">{item.question}</span>
						<span class="flex size-6 flex-[0_0_24px] items-center justify-center text-[22px] font-light text-(--teal)" aria-hidden="true">
							<span class="group-open:hidden">+</span><span class="hidden group-open:inline">−</span>
						</span>
					</summary>
					<p class="aurora-answer max-w-175 px-1 pb-6 text-[14.5px] leading-[1.74] text-muted-foreground">{item.answer}</p>
				</details>
			{/each}
		</div>
	</div>
</section>
