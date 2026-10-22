<script lang="ts">
	import LanguagesIcon from '@lucide/svelte/icons/languages'
	import { buttonVariants } from '#lib/components/ui/button/index.js'
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js'
	import { languageName } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js'
	import { cn } from '#lib/utils.js'

	let { size = 'default' } : { size ?: 'sm' | 'default' } = $props()

	const locale = getLocale()
</script>

<!-- The code on the trigger says what's active at a glance; the menu names each language in
     its own language, so a visitor who can't read the current one still finds theirs. -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger class={cn( buttonVariants( { variant: 'ghost', size } ), 'locale-switcher-trigger gap-1.5' )} aria-label={m.hello_language()}>
		<LanguagesIcon data-icon="inline-start" />
		<span class="text-xs font-medium tracking-wide">{locale.toUpperCase()}</span>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="min-w-44">
		<DropdownMenu.Group>
			<DropdownMenu.Label class="text-xs">{m.hello_language()}</DropdownMenu.Label>
			<!-- Getter pins the active locale; setter reloads into the new one. -->
			<DropdownMenu.RadioGroup bind:value={() => locale, ( value ) => value !== locale && setLocale( value as Locale )}>
				{#each locales as code ( code )}
					<DropdownMenu.RadioItem value={code} lang={code}>
						{languageName( code )}
						<DropdownMenu.Shortcut>{code.toUpperCase()}</DropdownMenu.Shortcut>
					</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<!-- The icon's two scripts ( 文 and A ) draw apart on hover and while the menu is open, as if
     one were sliding over to the other. Its first four paths are 文, the last two A. -->
<!-- Global: the class reaches the trigger as a plain string, outside this component's scope. -->
<style>
	@media ( prefers-reduced-motion: no-preference ) {
		/* A's stroke touches the viewBox edge: let the shift draw past it instead of clipping. */
		:global( .locale-switcher-trigger svg ) {
			overflow: visible;
		}

		:global( .locale-switcher-trigger svg path ) {
			transition: translate 200ms cubic-bezier( 0.33, 1, 0.68, 1 );
		}

		:global( .locale-switcher-trigger:is( :hover, [data-state='open'] ) svg path ) {
			transition-duration: 320ms;
		}

		:global( .locale-switcher-trigger:is( :hover, [data-state='open'] ) svg path:nth-of-type( -n + 4 ) ) {
			translate: -2.5px -2px;
		}

		:global( .locale-switcher-trigger:is( :hover, [data-state='open'] ) svg path:nth-of-type( n + 5 ) ) {
			translate: 2.5px 2px;
		}
	}
</style>
