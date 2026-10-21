<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell'
	import HouseIcon from '@lucide/svelte/icons/house'
	import ImagesIcon from '@lucide/svelte/icons/images'
	import MailIcon from '@lucide/svelte/icons/mail'
	import PaletteIcon from '@lucide/svelte/icons/palette'
	import SettingsIcon from '@lucide/svelte/icons/settings'
	import ShieldIcon from '@lucide/svelte/icons/shield'
	import UserIcon from '@lucide/svelte/icons/user'
	import UsersIcon from '@lucide/svelte/icons/users'
	import { paintAppearance } from '$lib/appearance'
	import { AppearancePicker, AppShell, filterNav, LocaleSwitcher, ThemeToggle, type NavGroup } from '$lib/layout'
	import { NotificationBell, NotificationStore, setNotifications } from '$lib/components/notifications'
	import { mutate } from '$lib/mutate'
	import { m } from '$lib/paraglide/messages'
	import { hasPermission } from '$lib/permissions'

	let { data, children } = $props()

	// `permission` hides an item from users without it; each page still guards itself.
	const nav = $derived( filterNav( [
		{
			items: [
				{ title: m.app_nav_home(), href: '/app', icon: HouseIcon },
				{ title: m.app_nav_media(), href: '/app/media', icon: ImagesIcon, module: 'media', permission: { media: [ 'list' ] }, keywords: [ 'images', 'files', 'upload' ] }
			]
		},
		{
			label: m.app_nav_account(),
			items: [
				{ title: m.app_nav_profile(), href: '/app/account', icon: UserIcon },
				{ title: m.app_nav_security(), href: '/app/account/security', icon: ShieldIcon, keywords: [ 'password' ] },
				{ title: m.app_nav_notifications(), href: '/app/account/notifications', icon: BellIcon, module: 'notifications', keywords: [ 'preferences' ] }
			]
		},
		{
			label: m.app_nav_admin(),
			items: [
				{ title: m.app_nav_users(), href: '/app/users', icon: UsersIcon, module: 'users', permission: { user: [ 'list' ] } },
				{ title: m.app_nav_appearance(), href: '/app/settings/appearance', icon: PaletteIcon, module: 'appearance', permission: { settings: [ 'update' ] }, keywords: [ 'theme', 'colour' ] },
				{ title: m.mail_title(), href: '/app/settings/mail', icon: MailIcon, module: 'mail', permission: { settings: [ 'update' ] }, keywords: [ 'email', 'smtp', 'templates' ] },
				{ title: m.app_nav_settings(), href: '/app/settings', icon: SettingsIcon, permission: { settings: [ 'update' ] } }
			]
		}
	] satisfies NavGroup[], ( permission ) => hasPermission( data.user.role, permission ), data.modules ) )

	let logoutForm = $state<HTMLFormElement>()

	// One store for the bell and the inbox page, re-seeded when the layout data reloads.
	// None when the notifications module is off ( the loader sent no first page ).
	// svelte-ignore state_referenced_locally
	const notifications = MODULES.notifications && data.notifications ? setNotifications( new NotificationStore( data.notifications ) ) : undefined

	$effect( () => {
		if ( data.notifications )
			notifications?.hydrate( data.notifications )
	} )

	// <html> is never re-rendered: keep its appearance classes on the server's answer, which
	// changes when an admin saves the workspace default or this person saves elsewhere.
	$effect( () => paintAppearance( data.appearance.resolved ) )

	// The picker saves without reloading the page ( a table keeps its page and filters ).
	const saveAppearance = async( override : typeof data.appearance.override ) =>
		( await mutate( '/api/appearance/me', { method: 'PUT', body: override, refresh: false, fallback: m.appearance_save_failed() } ) ).ok
</script>

<AppShell
	{nav}
	open={data.sidebarOpen}
	brand={{ name: data.tenant.name, logo: data.brand?.logo, href: '/app' }}
	user={{ name: data.user.name, email: data.user.email, avatar: data.user.image }}
	userMenu={[ { label: m.app_nav_profile(), icon: UserIcon, href: '/app/account' } ]}
	onlogout={() => logoutForm?.requestSubmit()}
>
	{#snippet actions()}
		{#if MODULES.notifications && notifications}
			<NotificationBell />
		{/if}
		{#if MODULES.appearance && data.modules.includes( 'appearance' ) && data.appearance.setting.allowUserOverride}
			<AppearancePicker setting={data.appearance.setting} override={data.appearance.override} onsave={saveAppearance} />
		{/if}
		<LocaleSwitcher size="sm" />
		<ThemeToggle />
	{/snippet}

	{@render children()}
</AppShell>

<!-- Sign-out is a POST ( see /logout ). -->
<form method="POST" action="/logout" bind:this={logoutForm} hidden></form>
