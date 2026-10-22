<script lang="ts">
	import { page } from '$app/state'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import * as Collapsible from '#lib/components/ui/collapsible/index.js'
	import * as Sidebar from '#lib/components/ui/sidebar/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { isPending } from '#lib/components/nav-progress/index.js'
	import type { NavGroup, NavItem } from './nav'

	let { group } : { group : NavGroup } = $props()

	const sidebar = Sidebar.useSidebar()

	const holdsPath = ( item : NavItem, path : string ) => !!item.items?.some( ( sub ) => sub.href === path )

	// Which sections are open. Seeded with the one holding the current page so the
	// server renders it open ( no expand-on-hydrate jump ). Later navigations: the effect.
	// svelte-ignore state_referenced_locally
	let openState = $state<Record<string, boolean>>(
		Object.fromEntries( group.items.filter( ( item ) => holdsPath( item, page.url.pathname ) ).map( ( item ) => [ item.title, true ] ) )
	)

	// Reopen the current page's section on EVERY navigation ( palette, links, Back ), not
	// only the first. Keyed on the pathname, so a manual collapse sticks until you move.
	// Writes openState, never reads it — so it can't retrigger itself.
	$effect( () => {
		const path = page.url.pathname
		const active = group.items.find( ( item ) => holdsPath( item, path ) )

		if ( active )
			openState[ active.title ] = true
	} )

	const collapsed = $derived( sidebar.state === 'collapsed' && !sidebar.isMobile )

	function setSection( title : string, open : boolean ) {
		// Sub-items are hidden on the icon rail, so a parent click there expands the
		// sidebar and opens the section instead of toggling something invisible.
		if ( collapsed ) {
			sidebar.setOpen( true )
			openState[ title ] = true

			return
		}

		openState[ title ] = open
	}
</script>

<Sidebar.Group>
	{#if group.label}
		<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
	{/if}
	<Sidebar.Menu>
		{#each group.items as item ( item.title )}
			{#if item.items?.length}
				{@const open = openState[ item.title ] ?? false}
				<Collapsible.Root {open} onOpenChange={( value ) => setSection( item.title, value )} class="group/collapsible">
					{#snippet child( { props } )}
						<Sidebar.MenuItem {...props}>
							<Collapsible.Trigger>
								{#snippet child( { props } )}
									<!-- Marked active while its current child is out of sight. -->
									<Sidebar.MenuButton
										{...props}
										tooltipContent={item.title}
										isActive={holdsPath( item, page.url.pathname ) && ( collapsed || !open )}
									>
										{#if item.icon}
											<item.icon />
										{/if}
										<span>{item.title}</span>
										<ChevronRightIcon class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</Sidebar.MenuButton>
								{/snippet}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<Sidebar.MenuSub>
									{#each item.items ?? [] as sub ( sub.href ?? sub.title )}
										<Sidebar.MenuSubItem>
											<Sidebar.MenuSubButton href={sub.href} isActive={page.url.pathname === sub.href}>
												<span>{sub.title}</span>
												{#if sub.href && isPending( sub.href )}
													<Spinner class="text-muted-foreground ms-auto size-3.5" />
												{/if}
											</Sidebar.MenuSubButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							</Collapsible.Content>
						</Sidebar.MenuItem>
					{/snippet}
				</Collapsible.Root>
			{:else if item.href}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={page.url.pathname === item.href} tooltipContent={item.title}>
						{#snippet child( { props } )}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- caller's nav config; hrefs are full paths -->
							<a href={item.href} {...props}>
								{#if item.icon}
									<item.icon />
								{/if}
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
