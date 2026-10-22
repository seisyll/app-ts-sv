<script lang="ts">
	import { MaskInput, type MaskInputOptions } from 'maska'
	import type { HTMLInputAttributes } from 'svelte/elements'
	import { Input } from '#lib/components/ui/input/index.js'

	/* ―― » An Input with a mask ( the fundraiser app's, on maska ): the person sees the shape
	        ( +62 812-3456-7890, 1234 5678 ) while typing; `unmasked` is the plain value. With
	        `name` the PLAIN value posts with the form, the shaped one never does.
	        maska attaches to the element itself ( through `ref` ), so the shadcn Input stays as
	        it is.   mask: '+## ###-####-####' · '#### ####' · { mask: …, tokens: … } */
	let {
		ref = $bindable( null ),
		value = $bindable( '' ),
		unmasked = $bindable( '' ),
		mask,
		name,
		...rest
	} : Omit<HTMLInputAttributes, 'name' | 'type' | 'value' | 'files'> & {
		ref ?    : HTMLInputElement | null
		value ?  : string
		mask     : string | MaskInputOptions
		// What the form posts: the unmasked value.
		name ?   : string
		unmasked ?: string
	} = $props()

	const options = $derived( typeof mask === 'string' ? { mask } : mask )

	$effect( () => {
		if ( !ref )
			return

		const input = new MaskInput( ref, { ...options, onMaska: ( detail ) => ( unmasked = detail.unmasked ) } )

		return () => input.destroy()
	} )
</script>

<Input bind:ref={ref as HTMLElement | null} bind:value type="text" {...rest} />
{#if name}<input type="hidden" {name} value={unmasked} />{/if}
