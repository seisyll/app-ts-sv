<script lang="ts">
	import { toast } from 'svelte-sonner'
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical'
	import UserIcon from '@lucide/svelte/icons/user'
	import { AppShell, LocaleSwitcher, ThemeToggle } from '$lib/layout'
	import { m } from '$lib/paraglide/messages'
	import { BASE, demoNav } from './nav'

	// `@(dev)` resets past the playground layout: the shell owns the whole screen.
	let { data, children } = $props()
</script>

<AppShell
	nav={demoNav()}
	open={data.sidebarOpen}
	brand={{ name: 'Acme Inc', href: BASE }}
	user={{ name: 'Ada Lovelace', email: 'ada@acme.test' }}
	userMenu={[
		{ label: m.demo_nav_profile(), icon: UserIcon, href: `${ BASE }/profile` },
		{ label: m.demo_nav_playground(), icon: FlaskConicalIcon, href: '/hello' }
	]}
	onlogout={() => toast( m.demo_shell_logged_out() )}
>
	{#snippet actions()}
		<LocaleSwitcher size="sm" />
		<ThemeToggle />
	{/snippet}

	{@render children()}
</AppShell>
