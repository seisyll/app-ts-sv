<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import { Checkbox } from '#lib/components/ui/checkbox/index.js'

	// Centered checkbox for the select column. Controlled: TanStack owns the state.
	let {
		checked = false,
		onCheckedChange = ( value ) => ( checked = value ),
		...restProps
	} : ComponentProps<typeof Checkbox> = $props()
</script>

<div class="flex items-center justify-center">
	<Checkbox bind:checked={() => checked, onCheckedChange} {...restProps} />
</div>
