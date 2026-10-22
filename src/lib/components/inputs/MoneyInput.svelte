<script lang="ts">
	import { MaskInput } from 'maska'
	import * as InputGroup from '#lib/components/ui/input-group/index.js'
	import { APP } from '#lib/config.js'
	import { getLocale } from '#lib/paraglide/runtime.js'

	/* ―― » An amount of money ( the fundraiser app's CurrencyInput, in any currency ): the digits
	        group as they are typed ( maska's number mode, in the reader's locale ), the currency's
	        symbol sits beside them, and decimals follow the currency ( none for IDR or JPY, two
	        for USD ). `value` is a plain number — or null when empty — and that is what posts
	        with `name`. */
	let {
		value = $bindable( null ),
		currency = APP.currency,
		name,
		id,
		min,
		placeholder,
		disabled = false,
		invalid = false,
		class: className
	} : {
		value ?       : number | null
		currency ?    : string
		name ?        : string
		id ?          : string
		// 0 or more: no minus sign.
		min ?         : number
		placeholder ? : string
		disabled ?    : boolean
		invalid ?     : boolean
		class ?       : string
	} = $props()

	const locale = getLocale()
	const format = $derived( new Intl.NumberFormat( locale, { style: 'currency', currency } ) )
	const symbol = $derived( format.formatToParts( 0 ).find( ( part ) => part.type === 'currency' )?.value ?? currency )
	const fraction = $derived( format.resolvedOptions().maximumFractionDigits ?? 2 )
	const shown = new Intl.NumberFormat( locale, { useGrouping: true, maximumFractionDigits: 20 } )

	let ref = $state<HTMLInputElement | null>( null )
	// What the field shows; seeded from `value`, then owned by the mask.
	// svelte-ignore state_referenced_locally
	let text = $state( value === null ? '' : shown.format( value ) )

	$effect( () => {
		if ( !ref )
			return

		const input = new MaskInput( ref, {
			number : { locale, fraction, unsigned: ( min ?? -1 ) >= 0 },
			onMaska: ( detail ) => {
				const number = detail.unmasked === '' ? null : Number( detail.unmasked )

				value = number === null || Number.isFinite( number ) ? number : null
			}
		} )

		return () => input.destroy()
	} )
</script>

<InputGroup.Root class={className}>
	<InputGroup.Addon><InputGroup.Text>{symbol}</InputGroup.Text></InputGroup.Addon>
	<InputGroup.Input bind:ref bind:value={text} {id} inputmode="decimal" autocomplete="off" {placeholder} {disabled} aria-invalid={invalid || undefined} class="tabular-nums" />
</InputGroup.Root>
{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
