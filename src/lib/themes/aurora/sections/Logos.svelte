<script lang="ts">
	import type { HomeContent } from '../../contract'
	import { reveal } from '../actions'

	let { logos } : { logos : HomeContent['logos'] } = $props()
</script>

<section class="border-y border-white/5.5 bg-white/[0.012] px-5 py-9.5 sm:px-8 lg:px-18">
	<p use:reveal class="mb-6.5 text-center font-mono text-[11px] tracking-[0.26em] text-(--faint) uppercase">{logos.title}</p>
	<ul class="mx-auto flex max-w-275 flex-wrap items-center justify-center gap-x-[clamp(28px,5vw,64px)] gap-y-7">
		{#each logos.names as name ( name )}
			<li class="font-serif text-[24px] font-medium tracking-[0.03em] text-[#5c646d] transition-colors duration-300 hover:text-(--soft)">{name}</li>
		{/each}
	</ul>
</section>
