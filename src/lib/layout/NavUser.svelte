<script lang="ts" module>
	import type { Component } from 'svelte'

	export type NavUserInfo = {
		name     : string
		email ?  : string
		// Avatar URL. Omitted → initials only ( an undefined src would fetch the page ).
		avatar ? : string
		// Secondary line when there's no email, e.g. the role.
		detail ? : string
	}

	export type NavUserItem = {
		label     : string
		icon ?    : Component
		href ?    : string
		onclick ? : () => void
	}
</script>

<script lang="ts">
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
	import LogOutIcon from '@lucide/svelte/icons/log-out'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { initials } from '$lib/format'
	import { m } from '$lib/paraglide/messages'

	let {
		user,
		items = [],
		onlogout
	} : {
		user       : NavUserInfo
		items ?    : NavUserItem[]
		// Renders "Log out" when given.
		onlogout ? : () => void
	} = $props()

	const sidebar = Sidebar.useSidebar()
	const monogram = $derived( initials( user.name ) || '?' )
</script>

{#snippet identity( fallbackClass : string )}
	<Avatar.Root class="size-8 rounded-lg">
		{#if user.avatar}
			<Avatar.Image src={user.avatar} alt="" />
		{/if}
		<Avatar.Fallback class="rounded-lg text-xs font-medium {fallbackClass}">{monogram}</Avatar.Fallback>
	</Avatar.Root>
	<div class="grid min-w-0 flex-1 text-start text-sm leading-tight">
		<span class="truncate font-medium">{user.name}</span>
		{#if user.email ?? user.detail}
			<span class="text-muted-foreground truncate text-xs">{user.email ?? user.detail}</span>
		{/if}
	</div>
{/snippet}

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child( { props } )}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						{@render identity( 'bg-sidebar-accent' )}
						<ChevronsUpDownIcon class="ms-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5">
						{@render identity( 'bg-muted' )}
					</div>
				</DropdownMenu.Label>

				{#if items.length}
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						{#each items as item ( item.label )}
							{#if item.href}
								<DropdownMenu.Item>
									{#snippet child( { props } )}
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- caller-supplied full path -->
										<a href={item.href} {...props}>
											{#if item.icon}
												<item.icon />
											{/if}
											{item.label}
										</a>
									{/snippet}
								</DropdownMenu.Item>
							{:else}
								<DropdownMenu.Item onclick={item.onclick}>
									{#if item.icon}
										<item.icon />
									{/if}
									{item.label}
								</DropdownMenu.Item>
							{/if}
						{/each}
					</DropdownMenu.Group>
				{/if}

				{#if onlogout}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={onlogout}>
						<LogOutIcon />
						{m.shell_logout()}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
