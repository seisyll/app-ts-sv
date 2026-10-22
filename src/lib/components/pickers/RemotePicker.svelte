<script lang="ts" module>
	export type PickerOption = { value : string, label : string, hint ?: string }
</script>

<script lang="ts" generics="T">
	import CheckIcon from '@lucide/svelte/icons/check'
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
	import XIcon from '@lucide/svelte/icons/x'
	import type { Paged } from '#lib/components/data-table/index.js'
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Command from '#lib/components/ui/command/index.js'
	import * as Popover from '#lib/components/ui/popover/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { debounce } from '#lib/debounce.js'
	import { errorMessage, http } from '#lib/http.js'
	import { m } from '#lib/paraglide/messages.js'

	/* ―― » A picker that searches at the server ( billing-app's RemotePicker, with A's multiple
	        choice ): any paged list endpoint — the DataTable contract, ?search=&take= — answers
	        as the person types. Not a <select> over a fetched list: a paged endpoint could only
	        ever fill it with its first page, and a picker that silently leaves out everyone
	        after the hundredth is worse than one that makes you type.

	        One choice: bind `value` ( and `label`, to show it without fetching the record ).
	        Several ( `multiple` ): bind `values` and `selected`; the choices show as chips under
	        the button. With `name`, the choice posts with its form. */
	let {
		path,
		toOption,
		multiple = false,
		value = $bindable( null ),
		label = $bindable( '' ),
		values = $bindable( [] ),
		selected = $bindable( [] ),
		name,
		id,
		params = {},
		placeholder = m.picker_placeholder(),
		searchPlaceholder = m.picker_search(),
		emptyLabel = m.picker_empty(),
		clearLabel,
		disabled = false,
		onchange
	} : {
		// A paged list endpoint, e.g. '/api/users'.
		path                : string
		toOption            : ( row : T ) => PickerOption
		multiple ?          : boolean
		value ?             : string | null
		label ?             : string
		values ?            : string[]
		selected ?          : PickerOption[]
		name ?              : string
		id ?                : string
		// Fixed query params that narrow what can be picked ( e.g. { 'f.role': 'admin' } );
		// an array repeats the key.
		params ?            : Record<string, string | string[]>
		placeholder ?       : string
		searchPlaceholder ? : string
		emptyLabel ?        : string
		// One choice: an explicit "none" entry, when clearing is a real action.
		clearLabel ?        : string
		disabled ?          : boolean
		// After `value` / `values` changed.
		onchange ?          : () => void
	} = $props()

	const TAKE = 20

	let open = $state( false )
	let query = $state( '' )
	let options = $state<PickerOption[]>( [] )
	let total = $state( 0 )
	let loading = $state( false )
	let error = $state( '' )
	// Drops out-of-order answers: a slow first request mustn't land after a newer one.
	let request = 0

	async function load( search : string ) : Promise<void> {
		const current = ++request
		const url = new URLSearchParams( { take: String( TAKE ), search } )

		for ( const [ key, item ] of Object.entries( params ) )
			for ( const one of Array.isArray( item ) ? item : [ item ] )
				url.append( key, one )

		loading = true

		try {
			const page = await http.get<Paged<T, unknown>>( `${ path }?${ url }` )

			if ( current !== request )
				return

			error = ''
			total = page.total
			options = page.rows.map( toOption )
		} catch ( caught ) {
			if ( current === request ) {
				error = errorMessage( caught )
				options = []
			}
		} finally {
			if ( current === request )
				loading = false
		}
	}

	const search = debounce( 300, ( term : string ) => void load( term ) )

	function onOpenChange( next : boolean ) : void {
		if ( next )
			void load( query )
		else
			search.cancel()
	}

	const isChosen = ( option : PickerOption ) => ( multiple ? values.includes( option.value ) : value === option.value )

	function choose( option : PickerOption | null ) : void {
		if ( multiple && option ) {
			const has = values.includes( option.value )

			values = has ? values.filter( ( item ) => item !== option.value ) : [ ...values, option.value ]
			selected = has ? selected.filter( ( item ) => item.value !== option.value ) : [ ...selected, option ]
		} else {
			value = option?.value ?? null
			label = option?.label ?? ''
			search.cancel()
			open = false
		}

		onchange?.()
	}

	function remove( option : PickerOption ) : void {
		values = values.filter( ( item ) => item !== option.value )
		selected = selected.filter( ( item ) => item.value !== option.value )
		onchange?.()
	}

	// The list holds at most TAKE rows: say when there are more, so it never reads as complete.
	const hidden = $derived( Math.max( 0, total - options.length ) )
	const shown = $derived( multiple ? ( selected.length ? m.picker_count( { count: selected.length } ) : '' ) : label )
</script>

<div class="flex flex-col gap-2">
	<Popover.Root bind:open {onOpenChange}>
		<Popover.Trigger {disabled}>
			{#snippet child( { props } )}
				<Button {...props} {id} variant="outline" role="combobox" aria-expanded={open} {disabled} class="w-full justify-between font-normal">
					<span class={shown ? 'truncate' : 'truncate text-muted-foreground'}>{shown || placeholder}</span>
					<ChevronsUpDownIcon class="opacity-50" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-(--bits-popover-anchor-width) min-w-64 p-0" align="start">
			<!-- shouldFilter off: the rows are already the server's answer to what was typed;
			     filtering them again would hide matches on columns the label doesn't show. -->
			<Command.Root shouldFilter={false}>
				<Command.Input placeholder={searchPlaceholder} bind:value={query} oninput={() => search( query )} />
				<Command.List>
					{#if loading}
						<div class="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Spinner class="size-4" />{m.picker_loading()}</div>
					{:else if error}
						<div class="px-3 py-4 text-sm text-destructive" role="alert">{error}</div>
					{:else}
						{#if !options.length}
							<div class="px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>
						{/if}
						<Command.Group>
							{#if clearLabel && !multiple}
								<Command.Item value="__none__" onSelect={() => choose( null )}>
									<XIcon class="opacity-50" /><span class="text-muted-foreground">{clearLabel}</span>
								</Command.Item>
							{/if}
							{#each options as option ( option.value )}
								<Command.Item value={option.value} onSelect={() => choose( option )}>
									<CheckIcon class={isChosen( option ) ? 'opacity-100' : 'opacity-0'} />
									<span class="min-w-0 flex-1">
										<span class="block truncate">{option.label}</span>
										{#if option.hint}<span class="block truncate text-xs text-muted-foreground">{option.hint}</span>{/if}
									</span>
								</Command.Item>
							{/each}
						</Command.Group>
						{#if hidden}
							<p class="border-t px-3 py-2 text-xs text-muted-foreground">{m.picker_more( { count: hidden } )}</p>
						{/if}
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>

	{#if multiple && selected.length}
		<ul class="flex flex-wrap gap-1.5" aria-label={m.picker_chosen()}>
			{#each selected as option ( option.value )}
				<li>
					<Badge variant="secondary" class="gap-1 pe-1">
						{option.label}
						<button type="button" class="rounded-full p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={m.picker_remove( { label: option.label } )} {disabled} onclick={() => remove( option )}><XIcon class="size-3" /></button>
					</Badge>
				</li>
			{/each}
		</ul>
	{/if}

	{#if name}
		{#if multiple}
			{#each values as item ( item )}<input type="hidden" {name} value={item} />{/each}
		{:else}
			<input type="hidden" {name} value={value ?? ''} />
		{/if}
	{/if}
</div>
