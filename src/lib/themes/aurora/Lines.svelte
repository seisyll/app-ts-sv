<script lang="ts">
	// A content title: "\n" becomes a line break, `accent` the italic teal ending.
	let { text, accent = '' } : { text : string, accent ?: string } = $props()

	const lines = $derived( text.split( '\n' ) )
</script>

{#each lines as line, index ( index )}{#if index > 0}<br />{/if}{line}{/each}{#if accent}{' '}<span class="text-(--teal-soft) italic">{accent}</span>{/if}
