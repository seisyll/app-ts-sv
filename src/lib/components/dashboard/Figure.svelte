<script lang="ts" module>
	// What a big number is, which decides how it reads: a count ( 1,284 ), money in APP.currency
	// ( $400 ), or a whole percentage ( 23% ).
	export type FigureUnit = 'count' | 'money' | 'percent'
</script>

<script lang="ts">
	import NumberFlow from '@number-flow/svelte'
	import { APP } from '$lib/config'
	import { getLocale } from '$lib/paraglide/runtime'

	/* ―― » A big number that rolls to its new value ( billing-app's Figure, NumberFlow ): when a
	        filter or a refresh changes it, the eye sees which figure moved and roughly how far.
	        NumberFlow honours prefers-reduced-motion itself. Its digits live in a shadow root that
	        screen readers, copy-paste and tests can't read, so the value is also printed once as
	        plain text, visually hidden — that is what the page says.
	        A string ( a dash for a read that failed, a label ) is printed as it is. */
	let { value, unit = 'count', class: className = '' } : {
		value    : number | string
		unit ?   : FigureUnit
		class ?  : string
	} = $props()

	const FORMATS : Record<FigureUnit, Intl.NumberFormatOptions> = {
		count  : {},
		money  : { style: 'currency', currency: APP.currency, maximumFractionDigits: 0 },
		percent: { maximumFractionDigits: 0 }
	}

	const locale = getLocale()
	const numeric = $derived( typeof value === 'number' && Number.isFinite( value ) )
	const suffix = $derived( unit === 'percent' ? '%' : undefined )
	const text = $derived( numeric ? `${ new Intl.NumberFormat( locale, FORMATS[ unit ] ).format( value as number ) }${ suffix ?? '' }` : String( value ) )
</script>

{#if numeric}
	<span class="inline-flex tabular-nums {className}">
		<span class="sr-only">{text}</span>
		<span aria-hidden="true" class="inline-flex"><NumberFlow value={value as number} locales={locale} format={FORMATS[ unit ]} {suffix} /></span>
	</span>
{:else}
	<span class={className}>{text}</span>
{/if}
