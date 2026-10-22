<script lang="ts">
	import { onMount } from 'svelte'
	import PrinterIcon from '@lucide/svelte/icons/printer'
	import { Button } from '#lib/components/ui/button/index.js'
	import { date } from '#lib/format.js'
	import { BrandMark } from '#lib/layout/index.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data } = $props()

	const table = $derived( data.table )

	/* ―― » Paper is light whatever the screen is: the dark class comes off while printing and
	        goes back after, so every colour stays a token. The dialog opens by itself once the
	        page is drawn ( ?preview: just the page ). */
	onMount( () => {
		const html = document.documentElement
		let dark = false
		const before = () => {
			dark = html.classList.contains( 'dark' )
			html.classList.remove( 'dark' )
		}
		const after = () => {
			if ( dark )
				html.classList.add( 'dark' )
		}

		addEventListener( 'beforeprint', before )
		addEventListener( 'afterprint', after )

		const timer = data.autoPrint ? setTimeout( () => print(), 300 ) : undefined

		return () => {
			clearTimeout( timer )
			removeEventListener( 'beforeprint', before )
			removeEventListener( 'afterprint', after )
		}
	} )
</script>

<svelte:head>
	<title>{table.title}</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-5 p-6 print:max-w-none print:p-0">
	<header class="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
		<div class="flex items-center gap-3">
			{#if data.brand?.logo}
				<img src={data.brand.logo} alt="" class="h-9 w-auto max-w-40 object-contain" />
			{:else if data.brand}
				<BrandMark name={data.brand.name} class="size-9" />
			{/if}
			<div class="flex flex-col">
				{#if data.brand}<span class="text-xs text-muted-foreground">{data.brand.name}</span>{/if}
				<h1 class="text-lg font-semibold tracking-tight">{table.title}</h1>
			</div>
		</div>
		<div class="flex flex-col items-end gap-2 text-end">
			<p class="text-xs text-muted-foreground tabular-nums">{m.print_rows( { count: table.rows.length } )} · {m.print_printed( { date: date( data.printedAt ) } )}</p>
			<Button size="sm" variant="outline" onclick={() => print()} class="print:hidden"><PrinterIcon />{m.print_button()}</Button>
		</div>
	</header>

	<p class="text-sm text-muted-foreground">
		<span class="font-medium text-foreground">{m.print_filters()}:</span>
		{table.filters.length ? table.filters.join( ' · ' ) : m.print_all_rows()}
	</p>

	<table class="w-full border-collapse text-xs">
		<!-- A thead repeats on every printed page. -->
		<thead>
			<tr>
				{#each table.headers as header, index ( index )}
					<th class="border bg-muted px-2 py-1.5 text-start font-semibold">{header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each table.rows as row, index ( index )}
				<tr class="break-inside-avoid">
					{#each row as cell, column ( column )}
						<td class="border px-2 py-1 align-top">{cell}</td>
					{/each}
				</tr>
			{:else}
				<tr><td colspan={table.headers.length} class="border px-2 py-6 text-center text-muted-foreground">{m.table_empty()}</td></tr>
			{/each}
		</tbody>
	</table>
</main>
