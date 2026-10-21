<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
	import { Button } from '$lib/components/ui/button'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import * as aurora from '$lib/themes/aurora'
	import { homeContent, siteChrome } from '$lib/themes/content'
	import type { ThemeModule } from '$lib/themes/contract'
	import * as plain from '$lib/themes/plain'
	import { m } from '$lib/paraglide/messages'
	import { DEMO_LOGO } from '../../demo-data'

	// Every theme side by side, without switching the client's theme and restarting. The list is also a
	// type check: a theme that breaks the contract fails `bun run check` here.
	const themes : ThemeModule[] = [ aurora, plain ]

	let current = $state( themes[ 0 ].id )
	let signUp = $state( false )
	let logo = $state( false )

	const theme = $derived( themes.find( ( item ) => item.id === current ) ?? themes[ 0 ] )
	const site = $derived( siteChrome( { signUp, logo: logo ? DEMO_LOGO : null } ) )
	const content = $derived( homeContent( { signUp } ) )
</script>

<svelte:head>
	<title>{m.demo_site_title()} · {m.hello_title()}</title>
</svelte:head>

{#key theme.id}
	<div class="theme-{theme.id} min-h-svh">
		<theme.Header {site} />
		<theme.Home {content} />
		<theme.Footer {site} />
	</div>
{/key}

<!-- Outside the theme wrapper, so the controls keep the app's own look. -->
<div class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/95 p-1.5 pe-4 text-foreground shadow-lg backdrop-blur">
	<Button href="/hello" variant="ghost" size="icon-sm" aria-label={m.hello_title()}><ArrowLeftIcon /></Button>
	<ToggleGroup.Root type="single" size="sm" variant="outline" aria-label={m.demo_site_theme()} bind:value={() => current, ( value ) => value && ( current = value )}>
		{#each themes as item ( item.id )}
			<ToggleGroup.Item value={item.id}>{item.id}</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
	<label class="flex items-center gap-2 text-sm">
		<Switch bind:checked={signUp} />
		{m.demo_site_signup()}
	</label>
	<label class="flex items-center gap-2 text-sm">
		<Switch bind:checked={logo} />
		{m.brand_logo()}
	</label>
</div>
