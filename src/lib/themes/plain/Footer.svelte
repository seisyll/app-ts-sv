<script lang="ts">
	import { NetworkIcon } from '$lib/components/site'
	import { Separator } from '$lib/components/ui/separator'
	import type { Site } from '../contract'

	let { site } : { site : Site } = $props()
</script>

<footer class="border-t">
	<div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
		<div class="flex flex-wrap justify-between gap-10">
			<div class="flex max-w-xs flex-col gap-2">
				<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
					{#if site.logo}<img src={site.logo} alt="" class="h-6 w-auto max-w-32 object-contain" />{/if}
					{site.name}
				</a>
				<p class="text-sm text-muted-foreground">{site.tagline}</p>
				{#each site.contact as link ( link.href )}
					<a href={link.href} class="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
				{/each}
				{#if site.social.length}
					<ul class="mt-2 flex flex-wrap gap-1">
						{#each site.social as link ( link.network )}
							<li>
								<a href={link.href} target="_blank" rel="noopener" aria-label={link.label} title={link.label} class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
									<NetworkIcon network={link.network} />
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<div class="flex gap-16">
				{#each site.columns as column ( column.title )}
					<div class="flex flex-col gap-3">
						<p class="text-sm font-medium">{column.title}</p>
						<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
							{#each column.links as link ( link.href )}
								<li><a href={link.href} class="transition-colors hover:text-foreground">{link.label}</a></li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
		<Separator />
		<p class="text-xs text-muted-foreground">{site.legal}</p>
	</div>
</footer>
