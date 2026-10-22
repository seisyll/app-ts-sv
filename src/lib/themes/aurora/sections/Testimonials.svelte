<script lang="ts">
	import { initials } from '#lib/format.js'
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'

	let { testimonials } : { testimonials : HomeContent['testimonials'] } = $props()
</script>

<section class="relative mx-auto max-w-310 px-5 py-[clamp(72px,11vh,130px)] sm:px-8 lg:px-18">
	<div class="mx-auto max-w-150 text-center">
		<Eyebrow text={testimonials.eyebrow} centered />
		<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(34px,5vw,62px)] leading-none font-light tracking-[-0.02em] text-foreground">{testimonials.title}</h2>
		<p use:reveal={{ delay: 110 }} class="mt-5 text-[clamp(14px,1vw,15.5px)] leading-[1.7] text-muted-foreground">{testimonials.lead}</p>
	</div>

	<div class="mt-[clamp(40px,6vh,64px)] grid grid-cols-1 gap-4.5 lg:grid-cols-3">
		{#each testimonials.items as item, index ( item.name )}
			<figure
				use:reveal={{ delay: index * 90 }}
				class={[
					'flex flex-col rounded-[18px] border bg-linear-to-b p-8',
					item.featured ? 'border-(--teal)/22 from-(--teal)/6 to-white/1' : 'border-white/8 from-white/[0.035] to-white/[0.008]'
				]}
			>
				<div class="h-6 font-serif text-[46px] leading-[0.6] text-(--teal)" aria-hidden="true">&ldquo;</div>
				<blockquote class="mt-3.5 flex-1 text-[15.5px] leading-[1.72] text-(--soft)">{item.quote}</blockquote>
				<figcaption class="mt-6.5 flex items-center gap-3.25">
					<div class="flex size-11 items-center justify-center rounded-full border border-(--teal)/30 bg-linear-to-br from-(--teal)/40 to-(--teal)/8 text-[14px] font-semibold text-[#c8f4ec]" aria-hidden="true">
						{initials( item.name )}
					</div>
					<div>
						<div class="text-[14px] font-medium text-foreground">{item.name}</div>
						<div class="font-mono text-[12px] tracking-[0.04em] text-(--faint)">{item.role}</div>
					</div>
				</figcaption>
			</figure>
		{/each}
	</div>
</section>
