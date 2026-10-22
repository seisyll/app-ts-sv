<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui'
	import * as Command from '#lib/components/ui/command/index.js'
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import type { NavSearchGroup } from './nav'
	import { navSearchFilter } from './search-score'

	let {
		open = $bindable( false ),
		groups
	} : {
		open ?  : boolean
		groups  : NavSearchGroup[]
	} = $props()

	let input = $state<HTMLInputElement | null>( null )

	const filter = $derived( navSearchFilter( groups.flatMap( ( group ) => group.entries ) ) )

	// bits-ui already focuses the input, but from inside requestAnimationFrame — which
	// never fires in a non-compositing document ( headless, hidden tab ), leaving a palette
	// that silently swallows typing. Same element, so it can't fight the library.
	$effect( () => {
		if ( open )
			input?.focus()
	} )
</script>

<!-- `value` is the href, not the title: titles repeat, and bits-ui keys scores by value.
     LinkItem renders a real <a>, so Enter/click navigate through SvelteKit; onSelect
     only closes ( calling goto too would navigate twice ). -->
<Command.Dialog bind:open {filter}>
	<Command.Input bind:ref={input} placeholder={m.shell_search_placeholder()} />
	<!-- ScrollArea because the stock list hides its scrollbar. The Viewport is required,
	     not cosmetic: bits-ui re-sorts groups by best match through it, and without it the
	     best result can sit buried in the last group. -->
	<Command.List class="relative overflow-hidden! [&>[data-slot=scroll-area-viewport]]:h-auto">
		<ScrollArea
			type="auto"
			class="max-h-[inherit] [&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-[inherit]"
		>
			<CommandPrimitive.Viewport>
				<Command.Empty>{m.shell_search_empty()}</Command.Empty>
				{#each groups as group ( group.heading )}
					<Command.Group heading={group.heading}>
						{#each group.entries as entry ( entry.href )}
							<Command.LinkItem
								href={entry.href}
								value={entry.href}
								keywords={entry.keywords}
								onSelect={() => ( open = false )}
							>
								{#if entry.icon}
									<entry.icon />
								{/if}
								<span>{entry.title}</span>
							</Command.LinkItem>
						{/each}
					</Command.Group>
				{/each}
			</CommandPrimitive.Viewport>
		</ScrollArea>
	</Command.List>
</Command.Dialog>
