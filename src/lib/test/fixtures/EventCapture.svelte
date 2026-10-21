<script lang="ts">
	// An image that listens for load and error: what makes Svelte's server render write its
	// inline capture handler ( src/lib/csp.test.ts ).
	let loaded = $state( false )
</script>

<img src="/x.png" alt="" onload={() => ( loaded = true )} onerror={() => ( loaded = false )} />
