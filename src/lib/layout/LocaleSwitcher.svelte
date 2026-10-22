<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js'
	import { languageName } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js'

	let { size = 'default' } : { size ?: 'sm' | 'default' } = $props()

	const locale = getLocale()
</script>

<!-- Getter pins the active locale ( no deselect ); setter reloads into the new one. -->
<ToggleGroup.Root
	type="single"
	variant="outline"
	{size}
	aria-label={m.hello_language()}
	bind:value={() => locale, ( value ) => value && setLocale( value as Locale )}
>
	{#each locales as code ( code )}
		<ToggleGroup.Item value={code} aria-label={languageName( code )}>
			{code.toUpperCase()}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
