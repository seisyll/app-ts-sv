<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { m } from '$lib/paraglide/messages'
	import Brand from './Brand.svelte'
	import { navSearchGroups, type NavGroup } from './nav'
	import NavMain from './NavMain.svelte'
	import NavSearch from './NavSearch.svelte'
	import NavUser, { type NavUserInfo, type NavUserItem } from './NavUser.svelte'

	let {
		nav,
		brand,
		user,
		userMenu,
		onlogout
	} : {
		nav        : NavGroup[]
		brand      : { name : string, logo ?: string | null, href ?: string }
		user ?     : NavUserInfo
		userMenu ? : NavUserItem[]
		onlogout ? : () => void
	} = $props()

	const sidebar = Sidebar.useSidebar()

	// On mobile the sidebar is a sheet; close it once a link has been followed.
	afterNavigate( () => sidebar.setOpenMobile( false ) )

	const searchGroups = $derived( navSearchGroups( nav, m.shell_search_general() ) )
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Brand {...brand} />
	</Sidebar.Header>

	<Sidebar.Content>
		<NavSearch groups={searchGroups} />
		{#each nav as group, index ( index )}
			<NavMain {group} />
		{/each}
	</Sidebar.Content>

	{#if user}
		<Sidebar.Footer>
			<NavUser {user} items={userMenu} {onlogout} />
		</Sidebar.Footer>
	{/if}

	<Sidebar.Rail />
</Sidebar.Root>
