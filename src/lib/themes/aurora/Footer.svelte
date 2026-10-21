<script lang="ts">
	import type { Site } from '../contract'
	import Mark from './Mark.svelte'

	let { site } : { site : Site } = $props()
</script>

<footer class="border-t border-white/7 bg-white/[0.012]">
	<div class="mx-auto max-w-310 px-5 pt-[clamp(54px,8vh,80px)] pb-8 sm:px-8 lg:px-18">
		<div class="flex flex-wrap justify-between gap-x-14 gap-y-10">
			<div class="max-w-80 flex-1 basis-65">
				<a href="/" class="flex items-center gap-2.75">
					<Mark />
					<span class="font-serif text-[23px] font-medium tracking-[0.02em] text-foreground">{site.name}</span>
				</a>
				<p class="mt-4 max-w-65 text-[13.5px] leading-[1.66] text-muted-foreground">{site.tagline}</p>
			</div>

			{#each site.columns as column ( column.title )}
				<div class="basis-37.5">
					<p class="mb-4.5 font-mono text-[10px] tracking-[0.2em] text-(--faint) uppercase">{column.title}</p>
					<ul class="flex flex-col gap-3">
						{#each column.links as link ( link.href )}
							<li><a href={link.href} class="text-[13.5px] text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</a></li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="mt-[clamp(40px,6vh,60px)] border-t border-white/7 pt-6.5">
			<p class="font-mono text-[11px] tracking-[0.04em] text-(--faint)">{site.legal}</p>
		</div>
	</div>
</footer>
