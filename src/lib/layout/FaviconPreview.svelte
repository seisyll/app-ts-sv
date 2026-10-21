<script lang="ts">
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import XIcon from '@lucide/svelte/icons/x'

	// A browser tab with this icon and title, then the icon at the sizes browsers use — a
	// favicon is judged at 16 px, not in an upload preview. Decorative: the field says it all.
	let { icon, title } : { icon : string | null, title : string } = $props()
</script>

<div class="flex flex-col gap-3" aria-hidden="true">
	<div class="flex items-end rounded-t-lg border border-b-0 bg-muted px-2 pt-2">
		<div class="flex h-9 w-full max-w-60 min-w-0 items-center gap-2 rounded-t-md bg-background px-3 text-xs">
			{#if icon}
				<img src={icon} alt="" class="size-4 shrink-0 object-contain" />
			{:else}
				<GlobeIcon class="size-4 shrink-0 text-muted-foreground" />
			{/if}
			<span class="truncate">{title}</span>
			<XIcon class="ms-auto size-3.5 shrink-0 text-muted-foreground" />
		</div>
	</div>
	{#if icon}
		<div class="flex items-end gap-4">
			{#each [ 16, 32, 48 ] as size ( size )}
				<div class="flex flex-col items-center gap-1">
					<img src={icon} alt="" width={size} height={size} class="object-contain" />
					<span class="text-[11px] text-muted-foreground tabular-nums">{size}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
