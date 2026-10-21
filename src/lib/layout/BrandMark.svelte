<script lang="ts">
	import { initials } from '$lib/format'
	import { cn } from '$lib/utils'

	// The workspace's square: its logo, or its initials in the same square so a row keeps its
	// shape either way. Decorative ( empty alt ): the name always comes next.
	let { name, logo, class: className } : {
		name     : string
		logo ?   : string | null
		class ?  : string
	} = $props()

	const monogram = $derived( initials( name ) || '·' )
</script>

<div class={cn( 'flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg', !logo && 'bg-sidebar-primary text-sidebar-primary-foreground', className )}>
	{#if logo}
		<img src={logo} alt="" class="size-full object-contain" />
	{:else}
		<span class="text-xs font-semibold">{monogram}</span>
	{/if}
</div>
