<script lang="ts">
	// An image that listens for load and error: what makes Svelte's server render write its
	// inline capture handler ( src/lib/csp.test.ts ).
	let _loaded = $state( false )
</script>

<img src="/x.png" alt="" onload={() => ( _loaded = true )} onerror={() => ( _loaded = false )} />
