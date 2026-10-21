<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { getLocale } from '$lib/paraglide/runtime'
	import type { HomeContent } from '../contract'

	let { content } : { content : HomeContent } = $props()

	const stat = ( item : HomeContent['stats'][number] ) => new Intl.NumberFormat( getLocale(), { minimumFractionDigits: item.decimals ?? 0, maximumFractionDigits: item.decimals ?? 0 } ).format( item.value ) + ( item.suffix ?? '' )
</script>

<!-- "\n" in a title is a line break; the accent closes it in the muted colour. -->
{#snippet lines( text : string, accent = '' )}
	{#each text.split( '\n' ) as line, index ( index )}{#if index > 0}<br />{/if}{line}{/each}{#if accent}{' '}<span class="text-muted-foreground">{accent}</span>{/if}
{/snippet}

{#snippet head( eyebrow : string, title : string, lead = '' )}
	<div class="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
		<Badge variant="outline">{eyebrow}</Badge>
		<h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">{@render lines( title )}</h2>
		{#if lead}<p class="text-muted-foreground">{lead}</p>{/if}
	</div>
{/snippet}

<main class="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:py-24">
	<section class="flex flex-col items-center gap-6 text-center">
		<Badge variant="secondary">{content.hero.eyebrow}</Badge>
		<h1 class="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{@render lines( content.hero.title, content.hero.accent )}</h1>
		<p class="max-w-xl text-lg text-muted-foreground">{content.hero.lead}</p>
		<div class="flex flex-wrap justify-center gap-2">
			<Button href={content.hero.primary.href} size="lg">{content.hero.primary.label}</Button>
			<Button href={content.hero.secondary.href} size="lg" variant="outline">{content.hero.secondary.label}</Button>
		</div>
	</section>

	<section class="flex flex-col items-center gap-4">
		<p class="text-sm text-muted-foreground">{content.logos.title}</p>
		<ul class="flex flex-wrap justify-center gap-x-10 gap-y-3 text-lg font-semibold text-muted-foreground/70">
			{#each content.logos.names as name ( name )}<li>{name}</li>{/each}
		</ul>
	</section>

	<section id="features" class="flex scroll-mt-20 flex-col gap-10">
		{@render head( content.features.eyebrow, content.features.title, content.features.lead )}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each content.features.items as item ( item.title )}
				<Card.Root>
					<Card.Header>
						<item.icon class="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
						<Card.Title>{item.title}</Card.Title>
						<Card.Description>{item.text}</Card.Description>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section id="how" class="flex scroll-mt-20 flex-col gap-10">
		{@render head( content.steps.eyebrow, content.steps.title, content.steps.lead )}
		<ol class="grid gap-4 md:grid-cols-3">
			{#each content.steps.items as step ( step.title )}
				<li class="flex flex-col gap-2 rounded-xl border p-6">
					<span class="text-xs font-medium tracking-wider text-muted-foreground">{step.tag}</span>
					<h3 class="font-semibold">{step.title}</h3>
					<p class="text-sm text-muted-foreground">{step.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="grid items-center gap-8 md:grid-cols-2">
		<div class="flex flex-col gap-3">
			<Badge variant="outline" class="self-start">{content.stack.eyebrow}</Badge>
			<h2 class="text-3xl font-semibold tracking-tight">{content.stack.about}</h2>
			<p class="text-muted-foreground">{content.stack.text}</p>
		</div>
		<ul class="flex flex-col gap-3">
			{#each content.stack.points as point ( point )}
				<li class="flex items-center gap-3"><CheckIcon class="size-4 text-muted-foreground" aria-hidden="true" />{point}</li>
			{/each}
		</ul>
	</section>

	<dl class="grid grid-cols-2 gap-8 rounded-xl border p-8 text-center md:grid-cols-4">
		{#each content.stats as item ( item.label )}
			<div class="flex flex-col-reverse gap-1">
				<dt class="text-sm text-muted-foreground">{item.label}</dt>
				<dd class="text-3xl font-semibold tabular-nums">{stat( item )}</dd>
			</div>
		{/each}
	</dl>

	<section class="flex flex-col gap-10">
		{@render head( content.testimonials.eyebrow, content.testimonials.title, content.testimonials.lead )}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each content.testimonials.items as item ( item.name )}
				<Card.Root>
					<Card.Content class="flex h-full flex-col gap-4">
						<blockquote class="flex-1">“{item.quote}”</blockquote>
						<p class="text-sm"><span class="font-medium">{item.name}</span> <span class="text-muted-foreground">· {item.role}</span></p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section id="pricing" class="flex scroll-mt-20 flex-col gap-10">
		{@render head( content.pricing.eyebrow, content.pricing.title, content.pricing.lead )}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each content.pricing.plans as plan ( plan.name )}
				<Card.Root class={plan.popular ? 'ring-2 ring-primary' : ''}>
					<Card.Header>
						<Card.Title>{plan.name}</Card.Title>
						<Card.Description>{plan.text}</Card.Description>
						{#if plan.popular}<Card.Action><Badge>{content.pricing.popular}</Badge></Card.Action>{/if}
					</Card.Header>
					<Card.Content class="flex flex-1 flex-col gap-6">
						<p><span class="text-4xl font-semibold">{plan.price}</span> <span class="text-sm text-muted-foreground">{content.pricing.period}</span></p>
						<ul class="flex flex-col gap-2 text-sm">
							{#each plan.features as feature ( feature )}
								<li class="flex items-center gap-2"><CheckIcon class="size-4 text-muted-foreground" aria-hidden="true" />{feature}</li>
							{/each}
						</ul>
					</Card.Content>
					<Card.Footer>
						<Button href={plan.cta.href} variant={plan.popular ? 'default' : 'outline'} class="w-full">{plan.cta.label}</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section id="faq" class="flex scroll-mt-20 flex-col gap-10">
		{@render head( content.faq.eyebrow, content.faq.title )}
		<div class="mx-auto w-full max-w-2xl divide-y border-y">
			{#each content.faq.items as item, index ( item.question )}
				<details name="plain-faq" open={index === 0} class="group py-4">
					<summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
						{item.question}
						<span class="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
					</summary>
					<p class="pt-3 text-muted-foreground">{item.answer}</p>
				</details>
			{/each}
		</div>
	</section>

	<section class="flex flex-col items-center gap-5 rounded-2xl border bg-muted/40 px-6 py-16 text-center">
		<Badge variant="outline">{content.cta.eyebrow}</Badge>
		<h2 class="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">{@render lines( content.cta.title, content.cta.accent )}</h2>
		<p class="max-w-md text-muted-foreground">{content.cta.lead}</p>
		<div class="flex flex-wrap justify-center gap-2">
			<Button href={content.cta.primary.href} size="lg">{content.cta.primary.label}</Button>
			<Button href={content.cta.secondary.href} size="lg" variant="outline">{content.cta.secondary.label}</Button>
		</div>
		<p class="text-xs text-muted-foreground">{content.cta.note}</p>
	</section>
</main>
