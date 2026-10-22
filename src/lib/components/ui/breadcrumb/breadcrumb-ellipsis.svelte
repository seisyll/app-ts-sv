<script lang="ts">
	import MoreHorizontalIcon from "@lucide/svelte/icons/ellipsis";
	import { cn, type WithElementRef, type WithoutChildren } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
	bind:this={ref}
	data-slot="breadcrumb-ellipsis"
	role="presentation"
	aria-hidden="true"
	class={cn("cn-breadcrumb-ellipsis flex items-center justify-center", className)}
	{...restProps}
>
	<MoreHorizontalIcon />
	<span class="sr-only">More</span>
</span>
