<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search'
	import { buttonVariants } from '#lib/components/ui/button/index.js'
	import { Kbd, KbdGroup } from '#lib/components/ui/kbd/index.js'
	import * as Sidebar from '#lib/components/ui/sidebar/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'
	import CommandPalette from './CommandPalette.svelte'
	import type { NavSearchGroup } from './nav'

	let { groups } : { groups : NavSearchGroup[] } = $props()

	const sidebar = Sidebar.useSidebar()

	let open = $state( false )

	// Decided after mount: guessing the platform during SSR would mismatch on hydration.
	let modifier = $state( 'Ctrl' )

	$effect( () => {
		if ( /Mac|iPhone|iPad/.test( navigator.userAgent ) )
			modifier = '⌘'
	} )

	const collapsed = $derived( sidebar.state === 'collapsed' && !sidebar.isMobile )

	// Ctrl/⌘+B is the sidebar's; Ctrl/⌘+/ opens search.
	function onkeydown( event : KeyboardEvent ) {
		if ( event.key === '/' && ( event.metaKey || event.ctrlKey ) ) {
			event.preventDefault()
			open = !open
		}
	}
</script>

<svelte:window {onkeydown} />

<Sidebar.Group class="pb-0">
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			{#if collapsed}
				<Sidebar.MenuButton onclick={() => ( open = true )} tooltipContent={m.shell_search()}>
					<SearchIcon />
					<span>{m.shell_search()}</span>
				</Sidebar.MenuButton>
			{:else}
				<!-- A button dressed as an input: it opens the palette, it isn't one. -->
				<button
					type="button"
					onclick={() => ( open = true )}
					class={cn( buttonVariants( { variant: 'outline' } ), 'text-muted-foreground w-full cursor-text justify-start font-normal' )}
				>
					<SearchIcon class="opacity-50" />
					<span class="flex-1 text-start">{m.shell_search()}</span>
					<KbdGroup>
						<Kbd>{modifier}</Kbd>
						<Kbd>/</Kbd>
					</KbdGroup>
				</button>
			{/if}
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>

<CommandPalette bind:open {groups} />
