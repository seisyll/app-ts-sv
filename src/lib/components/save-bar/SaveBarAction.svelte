<script lang="ts">
	import type { Component } from 'svelte'
	import { Button, type ButtonProps } from '#lib/components/ui/button/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import * as Tooltip from '#lib/components/ui/tooltip/index.js'
	import { cn } from '#lib/utils.js'

	// One action on <SaveBar> ( its own Discard/Save and any page-specific extra ).
	// ≥sm: icon + label. <sm: icon only on a 40px target, label in tooltip + aria-label.
	// Must render inside <SaveBar>, which owns the Tooltip.Provider.
	let {
		label,
		icon,
		onclick,
		disabled = false,
		loading = false,
		variant = 'secondary',
		type = 'button',
		element = $bindable( null ),
		class: className
	} : {
		label     : string
		icon ?    : Component
		onclick ? : () => void
		disabled ?: boolean
		// Swaps the icon for a spinner and locks the button.
		loading ? : boolean
		variant ? : ButtonProps['variant']
		// 'submit' lets the save button drive a real <form>.
		type ?    : 'button' | 'submit'
		// Bound out so the bar can click it from Ctrl/Cmd+S ( works for submit buttons too ).
		element ? : HTMLButtonElement | null
		class ?   : string
	} = $props()

	const Icon = $derived( icon )
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child( { props } )}
			<Button
				{...props}
				bind:ref={element}
				{variant}
				{type}
				size="sm"
				class={cn( 'rounded-full max-sm:size-10 max-sm:p-0', className )}
				{onclick}
				disabled={disabled || loading}
				aria-label={label}
			>
				{#if loading}
					<Spinner />
				{:else if Icon}
					<Icon />
				{/if}
				<span class="hidden sm:inline">{label}</span>
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<!-- Above sm the label is already on the button. -->
	<Tooltip.Content class="sm:hidden">{label}</Tooltip.Content>
</Tooltip.Root>
