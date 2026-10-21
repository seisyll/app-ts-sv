<script lang="ts">
	import HouseIcon from '@lucide/svelte/icons/house'
	import SettingsIcon from '@lucide/svelte/icons/settings'
	import ShieldIcon from '@lucide/svelte/icons/shield'
	import UserIcon from '@lucide/svelte/icons/user'
	import UsersIcon from '@lucide/svelte/icons/users'
	import { AppShell, filterNav, LocaleSwitcher, ThemeToggle, type NavGroup } from '$lib/layout'
	import { m } from '$lib/paraglide/messages'
	import { hasPermission } from '$lib/permissions'

	let { data, children } = $props()

	// `permission` hides an item from users without it; each page still guards itself.
	const nav = $derived( filterNav( [
		{ items: [ { title: m.app_nav_home(), href: '/app', icon: HouseIcon } ] },
		{
			label: m.app_nav_account(),
			items: [
				{ title: m.app_nav_profile(), href: '/app/account', icon: UserIcon },
				{ title: m.app_nav_security(), href: '/app/account/security', icon: ShieldIcon, keywords: [ 'password' ] }
			]
		},
		{
			label: m.app_nav_admin(),
			items: [
				{ title: m.app_nav_users(), href: '/app/users', icon: UsersIcon, permission: { user: [ 'list' ] } },
				{ title: m.app_nav_settings(), href: '/app/settings', icon: SettingsIcon, permission: { settings: [ 'update' ] } }
			]
		}
	] satisfies NavGroup[], ( permission ) => hasPermission( data.user.role, permission ) ) )

	let logoutForm = $state<HTMLFormElement>()
</script>

<AppShell
	{nav}
	open={data.sidebarOpen}
	brand={{ name: data.tenant.name, href: '/app' }}
	user={{ name: data.user.name, email: data.user.email, avatar: data.user.image }}
	userMenu={[ { label: m.app_nav_profile(), icon: UserIcon, href: '/app/account' } ]}
	onlogout={() => logoutForm?.requestSubmit()}
>
	{#snippet actions()}
		<LocaleSwitcher size="sm" />
		<ThemeToggle />
	{/snippet}

	{@render children()}
</AppShell>

<!-- Sign-out is a POST ( see /logout ). -->
<form method="POST" action="/logout" bind:this={logoutForm} hidden></form>
