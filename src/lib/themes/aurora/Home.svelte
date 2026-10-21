<script lang="ts">
	import type { HomeContent } from '../contract'
	import Cta from './sections/Cta.svelte'
	import Faq from './sections/Faq.svelte'
	import Features from './sections/Features.svelte'
	import Hero from './sections/Hero.svelte'
	import Logos from './sections/Logos.svelte'
	import Pricing from './sections/Pricing.svelte'
	import Stack from './sections/Stack.svelte'
	import Stats from './sections/Stats.svelte'
	import Steps from './sections/Steps.svelte'
	import Testimonials from './sections/Testimonials.svelte'

	let { content } : { content : HomeContent } = $props()
</script>

<!-- overflow-x-clip: the hero grid and glows bleed past the edges on purpose. -->
<main class="overflow-x-clip">
	<Hero hero={content.hero} />
	<Logos logos={content.logos} />
	<Features features={content.features} />
	<Steps steps={content.steps} />
	<Stack stack={content.stack} />
	<Stats stats={content.stats} />
	<Testimonials testimonials={content.testimonials} />
	<Pricing pricing={content.pricing} />
	<Faq faq={content.faq} />
	<Cta cta={content.cta} />
</main>
