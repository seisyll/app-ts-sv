<script lang="ts" generics="T = never">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import TooltipProvider from "./tooltip-provider.svelte";

	let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps<T> = $props();
</script>

<TooltipProvider>
	<TooltipPrimitive.Root bind:open {...restProps} />
</TooltipProvider>
