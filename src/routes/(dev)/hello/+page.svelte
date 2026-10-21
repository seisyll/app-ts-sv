<script lang="ts">
	import { toast } from 'svelte-sonner'
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { Separator } from '$lib/components/ui/separator'
	import { Spinner } from '$lib/components/ui/spinner'
	import { APP } from '$lib/config'
	import { date, languageName, money } from '$lib/format'
	import { m } from '$lib/paraglide/messages'
	import { getLocale } from '$lib/paraglide/runtime'
	import type { HelloResponse } from '../api/hello/+server'

	let { data } = $props()

	let fresh : HelloResponse | undefined = $state()
	let loading = $state( false )

	const hello = $derived( fresh ?? data.hello )
	const locale = getLocale()

	async function refetch() {
		loading = true

		try {
			const res = await fetch( '/api/hello' )

			if ( !res.ok ) throw new Error( `HTTP ${ res.status }` )

			fresh = await res.json()
			toast.success( m.hello_api_ok() )
		} catch {
			toast.error( m.hello_api_fail() )
		} finally {
			loading = false
		}
	}
</script>

<svelte:head>
	<title>{m.hello_title()}</title>
</svelte:head>

<h1 class="text-xl font-semibold tracking-tight">{m.nav_overview()}</h1>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.hello_i18n_title()}</Card.Title>
		<Card.Description>{m.hello_i18n_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<p class="text-lg">{m.hello_greeting( { name: APP.name } )}</p>
		<dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
			<dt class="text-muted-foreground">{m.hello_locale()}</dt>
			<dd class="flex items-center gap-2">{languageName( locale )} <Badge variant="secondary">{locale}</Badge></dd>
			<dt class="text-muted-foreground">{m.hello_price()}</dt>
			<dd class="tabular-nums">{money( 1234.5 )}</dd>
			<dt class="text-muted-foreground">{m.hello_date()}</dt>
			<dd>{date( hello.data.servedAt )}</dd>
		</dl>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.hello_api_title()}</Card.Title>
		<Card.Description>{m.hello_api_desc()}</Card.Description>
		<Card.Action>
			<Button variant="outline" size="sm" onclick={refetch} disabled={loading}>
				{#if loading}
					<Spinner data-icon="inline-start" />
				{:else}
					<RefreshCwIcon data-icon="inline-start" />
				{/if}
				{m.hello_api_refetch()}
			</Button>
		</Card.Action>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<p class="flex items-center gap-2">{hello.data.message} <Badge variant="outline">{hello.data.locale}</Badge></p>
		<Separator />
		<ul class="flex flex-col gap-2 text-sm">
			{#each hello.data.plans as plan ( plan.id )}
				<li class="flex items-center justify-between">
					<span>{plan.name}</span>
					<span class="tabular-nums">{plan.price === 0 ? m.hello_free() : money( plan.price )}</span>
				</li>
			{/each}
		</ul>
	</Card.Content>
	<Card.Footer class="text-muted-foreground text-xs">
		{m.hello_api_served( { time: date( hello.data.servedAt ) } )}
	</Card.Footer>
</Card.Root>
