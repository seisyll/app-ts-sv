<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js'
	import BrandMark from './BrandMark.svelte'

	// Whose app this is. A link home, not a switcher: one user, one tenant.
	let {
		name,
		logo,
		href = '/'
	} : {
		name    : string
		// Image URL. Without one, initials fill the same square so the row keeps its shape.
		logo ?  : string | null
		href ?  : string
	} = $props()
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton size="lg">
			{#snippet child( { props } )}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- caller-supplied full path -->
				<a {href} {...props}>
					<BrandMark {name} {logo} />
					<div class="grid flex-1 text-start text-sm leading-tight">
						<span class="truncate font-medium">{name}</span>
					</div>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
