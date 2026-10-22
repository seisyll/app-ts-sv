<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import PaletteIcon from '@lucide/svelte/icons/palette'
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import {
		NO_OVERRIDE,
		paintAppearance,
		paletteLabel,
		PALETTES,
		RADII,
		radiusLabel,
		resolveAppearance,
		styleDescription,
		styleLabel,
		STYLES,
		type AppearanceOverride,
		type AppearanceSetting
	} from '#lib/appearance.js'
	import { buttonVariants } from '#lib/components/ui/button/index.js'
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'

	/* ―― » One person's appearance ( from billing-app's header picker ): colour, style and
	        corners, each overriding the workspace on its own. Each knob is shaped like its
	        data — swatches you pick by eye, a list where the names need a sentence, corners
	        that draw their own curve — so the whole menu fits a short screen.

	        Optimistic: paints at once, then `onsave`; if that answers false the choice is
	        put back. Without `onsave` it only paints ( the playground ). */
	let { setting, override, onsave } : {
		setting  : AppearanceSetting
		override : AppearanceOverride
		onsave ? : ( next : AppearanceOverride ) => Promise<boolean>
	} = $props()

	// The menu's truth while a choice is newer than the props.
	let local = $state<AppearanceOverride>()

	const current = $derived( local ?? override )
	const resolved = $derived( resolveAppearance( setting, current ) )
	const overridden = $derived( current.palette !== null || current.style !== null || current.radius !== null )
	const swatch = $derived( PALETTES.find( ( palette ) => palette.id === resolved.palette )?.swatch )
	// The style overrules the stored radius ( Lyra, Sera, Rhea ): say so rather than hide it.
	const radiusIgnored = $derived( resolved.radius !== ( current.radius ?? setting.radius ) )

	// Two quick clicks race: a late failure must not paint over the newer choice.
	let sequence = 0

	async function save( next : AppearanceOverride ) {
		const mine = ++sequence
		const before = local

		local = next
		paintAppearance( resolveAppearance( setting, next ) )

		if ( onsave && !await onsave( next ) && mine === sequence ) {
			local = before
			paintAppearance( resolveAppearance( setting, before ?? override ) )
		}
	}

	const choose = ( knob : keyof AppearanceOverride, value : string ) => save( { ...current, [ knob ]: value } )
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={cn( buttonVariants( { variant: 'ghost', size: 'icon' } ), 'group relative' )}>
		<PaletteIcon class="transition-transform duration-200 motion-safe:group-data-[state=open]:-rotate-12" />
		{#if swatch}
			<span class="absolute end-1.5 bottom-1.5 size-1.5 rounded-full ring-1 ring-background" style="background: {swatch}"></span>
		{/if}
		<span class="sr-only">{m.appearance_open()}</span>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="w-64 p-2">
		<DropdownMenu.Group>
			<DropdownMenu.Label class="px-1 pt-2 pb-1 text-xs">{m.appearance_colour()}</DropdownMenu.Label>
			<div class="grid grid-cols-4 gap-1.5 px-1 pb-1">
				{#each PALETTES as palette ( palette.id )}
					{@const selected = palette.id === resolved.palette}
					<DropdownMenu.Item
						closeOnSelect={false}
						onclick={() => choose( 'palette', palette.id )}
						aria-label={paletteLabel( palette.id )}
						aria-current={selected ? 'true' : undefined}
						title={paletteLabel( palette.id )}
						class={cn( 'relative flex h-9 items-center justify-center rounded-md p-0 ring-offset-1 ring-offset-popover transition-[box-shadow,transform] duration-200', selected && 'ring-2 ring-foreground motion-safe:scale-105' )}
					>
						<span class="size-full rounded-md border border-black/10 dark:border-white/15" style="background: {palette.swatch}"></span>
						{#if selected}
							<CheckIcon class="absolute size-4 text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.55)]" />
						{/if}
						<span class="sr-only">{paletteLabel( palette.id )}</span>
					</DropdownMenu.Item>
				{/each}
			</div>
		</DropdownMenu.Group>

		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			<DropdownMenu.Label class="px-1 pt-2 pb-1 text-xs">{m.appearance_style()}</DropdownMenu.Label>
			<!-- The one group that scrolls: colour and corners stay in view. -->
			<div class="max-h-52 overflow-y-auto overscroll-contain">
				{#each STYLES as style ( style )}
					{@const selected = style === resolved.style}
					<DropdownMenu.Item closeOnSelect={false} onclick={() => choose( 'style', style )} aria-current={selected ? 'true' : undefined} class="gap-2 py-1.5">
						<div class="flex min-w-0 flex-col leading-tight">
							<span class="text-sm">{styleLabel( style )}</span>
							<span class="truncate text-[11px] text-muted-foreground">{styleDescription( style )}</span>
						</div>
						{#if selected}<CheckIcon class="ms-auto size-4 shrink-0" />{/if}
					</DropdownMenu.Item>
				{/each}
			</div>
		</DropdownMenu.Group>

		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			<DropdownMenu.Label class="flex items-baseline justify-between px-1 pt-2 pb-1 text-xs">
				{m.appearance_radius()}
				{#if radiusIgnored}<span class="text-[10px] font-normal text-muted-foreground">{m.appearance_radius_ignored()}</span>{/if}
			</DropdownMenu.Label>
			<div class="grid grid-cols-5 gap-1.5 px-1 pb-1">
				{#each RADII as radius ( radius.id )}
					{@const selected = radius.id === resolved.radius}
					<DropdownMenu.Item
						closeOnSelect={false}
						onclick={() => choose( 'radius', radius.id )}
						aria-label={radiusLabel( radius.id )}
						aria-current={selected ? 'true' : undefined}
						title={radiusLabel( radius.id )}
						class={cn( 'flex h-11 flex-col items-center justify-center gap-1 rounded-md p-0', selected && 'bg-accent text-accent-foreground' )}
					>
						<!-- A corner sample: only one corner rounded, so the curve reads at a glance. -->
						<span
							class={cn( 'size-5 border-2 border-e-transparent border-b-transparent transition-[border-radius] duration-200', selected ? 'border-foreground' : 'border-muted-foreground/60' )}
							style="border-start-start-radius: {radius.value}"
						></span>
						<span class="text-[10px] leading-none text-muted-foreground">{radiusLabel( radius.id )}</span>
					</DropdownMenu.Item>
				{/each}
			</div>
		</DropdownMenu.Group>

		{#if overridden}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={() => save( NO_OVERRIDE )} class="gap-2 py-1.5 text-xs">
				<RotateCcwIcon class="size-3.5 shrink-0" />
				{m.appearance_follow()}
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
