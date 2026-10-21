<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { initials } from '$lib/format'

	// Whose app this is. A link home, not a switcher: one user, one tenant.
	let {
		name,
		logo,
		href = '/'
	} : {
		name    : string
		// Image URL. Without one, initials fill the same square so the row keeps its shape.
		logo ?  : string
		href ?  : string
	} = $props()

	const monogram = $derived( initials( name ) || '·' )
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton size="lg">
			{#snippet child( { props } )}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- caller-supplied full path -->
				<a {href} {...props}>
					<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
						{#if logo}
							<!-- Empty alt: the name is the next element; announcing both would stutter. -->
							<img src={logo} alt="" class="size-full object-contain" />
						{:else}
							<span class="text-xs font-semibold">{monogram}</span>
						{/if}
					</div>
					<div class="grid flex-1 text-start text-sm leading-tight">
						<span class="truncate font-medium">{name}</span>
					</div>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
