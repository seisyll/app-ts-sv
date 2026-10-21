import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3'
import FolderKanbanIcon from '@lucide/svelte/icons/folder-kanban'
import InboxIcon from '@lucide/svelte/icons/inbox'
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
import SettingsIcon from '@lucide/svelte/icons/settings'
import UsersIcon from '@lucide/svelte/icons/users'
import type { NavGroup } from '$lib/layout'
import { m } from '$lib/paraglide/messages'

export const BASE = '/hello/shell'

// A function, not a constant: m.*() must run per request, in that request's locale.
export const demoNav = () : NavGroup[] => [
	{
		items: [
			{ title: m.demo_nav_dashboard(), href: BASE, icon: LayoutDashboardIcon, keywords: [ 'home' ] },
			{ title: m.demo_nav_inbox(), href: `${ BASE }/inbox`, icon: InboxIcon, keywords: [ 'messages' ] }
		]
	},
	{
		label: m.demo_nav_workspace(),
		items: [
			{
				title: m.demo_nav_projects(),
				icon : FolderKanbanIcon,
				items: [
					{ title: m.demo_nav_all_projects(), href: `${ BASE }/projects` },
					{ title: m.demo_nav_archived(), href: `${ BASE }/projects/archived` }
				]
			},
			{
				title: m.demo_nav_customers(),
				icon : UsersIcon,
				items: [
					{ title: m.demo_nav_customer_list(), href: `${ BASE }/customers`, keywords: [ 'clients' ] },
					{ title: m.demo_nav_segments(), href: `${ BASE }/customers/segments` }
				]
			},
			{
				title: m.demo_nav_reports(),
				icon : BarChart3Icon,
				items: [
					{ title: m.nav_overview(), href: `${ BASE }/reports` },
					{ title: m.demo_nav_revenue(), href: `${ BASE }/reports/revenue`, keywords: [ 'income', 'sales' ] }
				]
			}
		]
	},
	{
		label: m.demo_nav_settings(),
		items: [
			{ title: m.demo_nav_general(), href: `${ BASE }/settings`, icon: SettingsIcon },
			{
				title: m.demo_nav_team(),
				icon : UsersIcon,
				items: [
					{ title: m.demo_nav_members(), href: `${ BASE }/settings/team`, keywords: [ 'staff', 'people' ] },
					{ title: m.demo_nav_roles(), href: `${ BASE }/settings/roles`, keywords: [ 'permissions' ] }
				]
			},
			{ title: m.demo_nav_billing(), href: `${ BASE }/settings/billing`, icon: SettingsIcon, keywords: [ 'invoice', 'payment' ] }
		]
	}
]
