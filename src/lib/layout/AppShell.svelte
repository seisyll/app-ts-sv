<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte'
	import { page } from '$app/state'
	import * as Breadcrumb from '$lib/components/ui/breadcrumb'
	import { Separator } from '$lib/components/ui/separator'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import AppSidebar from './AppSidebar.svelte'
	import { navTrail } from './nav'
	import './sidebar-motion.css'

	/* ―― » The dashboard frame: sidebar ( brand, search, nav, user ) + header ( sidebar
	        trigger, breadcrumb from the nav config, `actions` on the right ) + content.
	        Pass `open` from the `sidebar_state` cookie, read in a server load, so a
	        collapsed sidebar stays collapsed across reloads. */
	let {
		open = true,
		actions,
		children,
		...sidebar
	} : ComponentProps<typeof AppSidebar> & {
		open ?    : boolean
		actions ? : Snippet
		children  : Snippet
	} = $props()

	const trail = $derived( navTrail( sidebar.nav, page.url.pathname ) )
</script>

<Sidebar.Provider {open}>
	<AppSidebar {...sidebar} />
	<!-- min-w-0: otherwise wide content ( tables ) grows the inset and the PAGE scrolls. -->
	<Sidebar.Inset class="min-w-0">
		<header class="flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="mx-0.5 data-vertical:h-4 data-vertical:self-center" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					{#each trail as crumb, index ( index )}
						{@const last = index === trail.length - 1}
						{#if index > 0}
							<Breadcrumb.Separator class="hidden md:block" />
						{/if}
						<!-- Only the current page fits on a phone. -->
						<Breadcrumb.Item class={last ? '' : 'hidden md:block'}>
							{#if last}
								<Breadcrumb.Page>{crumb.title}</Breadcrumb.Page>
							{:else if crumb.href}
								<Breadcrumb.Link href={crumb.href}>{crumb.title}</Breadcrumb.Link>
							{:else}
								{crumb.title}
							{/if}
						</Breadcrumb.Item>
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<div class="ms-auto flex items-center gap-1">
				{@render actions?.()}
			</div>
		</header>

		<div class="flex flex-1 flex-col gap-6 p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
