<script lang="ts">
	import { reveal } from './actions'

	// Centred section heads get the star on both sides.
	let { text, centered = false } : { text : string, centered ?: boolean } = $props()
</script>

<p use:reveal class="font-mono text-[11px] tracking-[0.34em] text-(--teal-dim) uppercase">
	<span aria-hidden="true">✦&nbsp;&nbsp;</span>{text}{#if centered}<span aria-hidden="true">&nbsp;&nbsp;✦</span>{/if}
</p>
