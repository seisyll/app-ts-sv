<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload'
	import { cn } from '$lib/utils'

	/* ―― » Drop files, or click to choose them: a <label> around a real file input, so the
	        keyboard and screen readers get the native picker. No upload library — the
	        caller receives File objects and decides what to do ( uploadMedia ). */
	let { accept, multiple = true, title, hint, disabled = false, compact = false, class: className, onfiles } : {
		accept     : string
		multiple ? : boolean
		title      : string
		hint ?     : string
		disabled ? : boolean
		compact ?  : boolean
		class ?    : string
		onfiles    : ( files : File[] ) => void
	} = $props()

	let dragging = $state( false )

	function take( list : FileList | null | undefined ) {
		const files = [ ...list ?? [] ]

		if ( files.length && !disabled )
			onfiles( multiple ? files : files.slice( 0, 1 ) )
	}
</script>

<label
	class={cn(
		'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
		compact ? 'px-4 py-5' : 'px-6 py-10',
		dragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
		disabled && 'pointer-events-none opacity-50',
		className
	)}
	ondragenter={( event ) => { event.preventDefault(); dragging = true }}
	ondragover={( event ) => event.preventDefault()}
	ondragleave={( event ) => { if ( !event.currentTarget.contains( event.relatedTarget as Node | null ) ) dragging = false }}
	ondrop={( event ) => { event.preventDefault(); dragging = false; take( event.dataTransfer?.files ) }}
>
	<UploadIcon class="size-5 text-muted-foreground" aria-hidden="true" />
	<span class="text-sm font-medium">{title}</span>
	{#if hint}<span class="text-xs text-muted-foreground">{hint}</span>{/if}
	<input
		type="file"
		class="sr-only"
		{accept}
		{multiple}
		{disabled}
		onchange={( event ) => { take( event.currentTarget.files ); event.currentTarget.value = '' }}
	/>
</label>
