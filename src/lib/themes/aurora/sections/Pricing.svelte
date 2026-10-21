<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'
	import Eyebrow from '../Eyebrow.svelte'

	let { pricing } : { pricing : HomeContent['pricing'] } = $props()
</script>

<section id="pricing" class="relative scroll-mt-20 border-t border-white/5.5">
	<div class="mx-auto max-w-295 px-5 py-[clamp(72px,11vh,130px)] sm:px-8 lg:px-18">
		<div class="mx-auto max-w-150 text-center">
			<Eyebrow text={pricing.eyebrow} centered />
			<h2 use:reveal={{ delay: 60 }} class="mt-4.5 font-serif text-[clamp(34px,5vw,62px)] leading-none font-light tracking-[-0.02em] text-foreground">{pricing.title}</h2>
			<p use:reveal={{ delay: 110 }} class="mt-5 text-[clamp(14px,1vw,15.5px)] leading-[1.7] text-muted-foreground">{pricing.lead}</p>
		</div>

		<div class="mt-[clamp(40px,6vh,64px)] grid grid-cols-1 items-stretch gap-4.5 lg:grid-cols-3">
			{#each pricing.plans as plan, index ( plan.name )}
				<div
					use:reveal={{ delay: index * 90 }}
					class={[
						'relative flex flex-col rounded-[20px] border bg-linear-to-b px-7.5 py-8.5',
						plan.popular ? 'border-(--teal)/42 from-(--teal)/9 to-white/[0.012] shadow-[0_0_50px_rgba(86,231,209,0.1)]' : 'border-white/8 from-white/[0.035] to-white/[0.008]'
					]}
				>
					{#if plan.popular}
						<p class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-(--teal) px-3.5 py-1.25 font-mono text-[10px] font-semibold tracking-[0.18em] whitespace-nowrap text-(--ink) uppercase">{pricing.popular}</p>
					{/if}
					<h3 class="font-mono text-[11px] tracking-[0.2em] text-(--teal-soft) uppercase">{plan.name}</h3>
					<p class="mt-4.5 flex items-end gap-2">
						<span class="font-serif text-[clamp(40px,4.5vw,54px)] leading-[0.9] font-light text-foreground">{plan.price}</span>
						<span class="mb-2 text-[13px] text-(--faint)">{pricing.period}</span>
					</p>
					<p class="mt-3.5 text-[13.5px] leading-[1.6] text-muted-foreground">{plan.text}</p>
					<div class={[ 'my-6.5 h-px', plan.popular ? 'bg-(--teal)/18' : 'bg-white/8' ]}></div>
					<ul class="flex flex-1 flex-col gap-3.25">
						{#each plan.features as feature ( feature )}
							<li class="flex items-center gap-2.75">
								<CheckIcon class="size-3.75 shrink-0 text-(--teal)" strokeWidth={2.2} aria-hidden="true" />
								<span class={[ 'text-[13.5px]', plan.popular ? 'text-(--soft)' : 'text-muted-foreground' ]}>{feature}</span>
							</li>
						{/each}
					</ul>
					<a
						href={plan.cta.href}
						class={[
							'mt-7 rounded-full py-3.25 text-center text-[13.5px] transition-all duration-300',
							plan.popular ? 'bg-foreground font-semibold text-(--ink) hover:-translate-y-0.5 hover:bg-white' : 'border border-white/14 bg-white/3 font-medium text-(--soft) hover:border-white/24 hover:bg-white/8'
						]}
					>{plan.cta.label}</a>
				</div>
			{/each}
		</div>
	</div>
</section>
