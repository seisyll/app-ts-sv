<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import {
		coupledRadius,
		paintAppearance,
		paletteLabel,
		PALETTES,
		RADII,
		radiusLabel,
		resolveAppearance,
		styleDescription,
		styleLabel,
		STYLES
	} from '$lib/appearance'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Switch } from '$lib/components/ui/switch'
	import { MediaField } from '$lib/components/media'
	import { SaveBar } from '$lib/components/save-bar'
	import { BrandMark, FaviconPreview } from '$lib/layout'
	import { mediaUrl } from '$lib/media'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import { appearancePageSchema } from './schema'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		validators: valibot( appearancePageSchema ),
		resetForm : false,
		onUpdated : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form

	const dirty = $derived( form.isTainted( $tainted ) )
	const forced = $derived( coupledRadius( $values.style, $values.radius ) )

	// While editing, the page previews what everyone will get ( without this admin's own
	// overrides ); otherwise, and on the way out, the look this admin actually has.
	// The cleanup ( browser only, unlike onDestroy ) restores it when the page goes.
	$effect( () => {
		paintAppearance( dirty ? resolveAppearance( $values ) : data.appearance.resolved )

		return () => paintAppearance( data.appearance.resolved )
	} )

	// The brand previews follow the form, before it is saved.
	const logo = $derived( $values.logo ? mediaUrl( $values.logo, 'thumb' ) : null )
	const favicon = $derived( $values.favicon ? mediaUrl( $values.favicon, 'thumb' ) : null )

	// Native radios: arrow keys move within a group, and the form posts without JavaScript.
	const option = 'cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50'
</script>

<svelte:head>
	<title>{m.appearance_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.appearance_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.appearance_desc()}</p>
</div>

<!-- pb-24 keeps the last card clear of the SaveBar. -->
<form method="POST" use:enhance class="flex max-w-3xl flex-col gap-6 pb-24">
	<!-- The logo and favicon pick from the media library: only with that module. -->
	{#if MODULES.media && data.brandImages}
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.brand_logo()}</Card.Title>
				<Card.Description>{m.brand_logo_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex flex-col gap-2">
					<MediaField label={m.brand_logo()} name="logo" bind:value={$values.logo} contain />
					{#if $errors.logo}<p class="text-sm text-destructive">{$errors.logo[ 0 ]}</p>{/if}
				</div>
				<div class="flex flex-col gap-3 sm:w-64">
					<p class="text-xs font-medium text-muted-foreground">{m.brand_preview_sidebar()}</p>
					<div class="flex items-center gap-2 rounded-lg border bg-sidebar p-2 text-sm text-sidebar-foreground">
						<BrandMark name={data.tenant.name} {logo} />
						<span class="truncate font-medium">{data.tenant.name}</span>
					</div>
					<p class="text-xs font-medium text-muted-foreground">{m.brand_preview_site()}</p>
					<div class="flex h-14 items-center gap-2.5 rounded-lg border bg-background px-3">
						{#if logo}<img src={logo} alt="" class="h-8 w-auto max-w-40 object-contain" />{/if}
						<span class="truncate font-semibold tracking-tight">{data.tenant.name}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.brand_favicon()}</Card.Title>
				<Card.Description>{m.brand_favicon_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex flex-col gap-2">
					<MediaField label={m.brand_favicon()} name="favicon" bind:value={$values.favicon} contain />
					{#if $errors.favicon}<p class="text-sm text-destructive">{$errors.favicon[ 0 ]}</p>{/if}
				</div>
				<div class="sm:w-64">
					<FaviconPreview icon={favicon} title={data.tenant.name} />
				</div>
			</Card.Content>
			<Card.Footer>
				<p class="text-xs text-muted-foreground">{m.brand_public_note()}</p>
			</Card.Footer>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.appearance_colour()}</Card.Title>
			<Card.Description>{m.appearance_colour_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<fieldset class="grid grid-cols-4 gap-3 sm:grid-cols-8">
				<legend class="sr-only">{m.appearance_colour()}</legend>
				{#each PALETTES as palette ( palette.id )}
					<label class={cn( 'flex flex-col items-center gap-1.5 rounded-lg p-1.5', option )}>
						<input type="radio" name="palette" value={palette.id} bind:group={$values.palette} class="peer sr-only" />
						<span class="size-10 rounded-md border border-black/10 ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground dark:border-white/15" style="background: {palette.swatch}"></span>
						<span class="text-xs text-muted-foreground peer-checked:text-foreground">{paletteLabel( palette.id )}</span>
					</label>
				{/each}
			</fieldset>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.appearance_style()}</Card.Title>
			<Card.Description>{m.appearance_style_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<fieldset class="grid gap-2 sm:grid-cols-2">
				<legend class="sr-only">{m.appearance_style()}</legend>
				{#each STYLES as style ( style )}
					<label class={cn( 'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 has-checked:border-foreground has-checked:bg-muted/50', option )}>
						<input type="radio" name="style" value={style} bind:group={$values.style} class="sr-only" />
						<span class="text-sm font-medium">{styleLabel( style )}</span>
						<span class="text-xs text-muted-foreground">{styleDescription( style )}</span>
					</label>
				{/each}
			</fieldset>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.appearance_radius()}</Card.Title>
			<Card.Description>{m.appearance_radius_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<fieldset class="grid grid-cols-5 gap-2">
				<legend class="sr-only">{m.appearance_radius()}</legend>
				{#each RADII as radius ( radius.id )}
					<label class={cn( 'flex flex-col items-center gap-2 rounded-lg border py-3 has-checked:border-foreground has-checked:bg-muted/50', option )}>
						<input type="radio" name="radius" value={radius.id} bind:group={$values.radius} class="sr-only" />
						<span class="size-6 border-2 border-e-transparent border-b-transparent border-foreground" style="border-start-start-radius: {radius.value}"></span>
						<span class="text-xs">{radiusLabel( radius.id )}</span>
					</label>
				{/each}
			</fieldset>
			{#if forced !== $values.radius}
				<p class="text-sm text-muted-foreground">{m.appearance_radius_coupled( { style: styleLabel( $values.style ), radius: radiusLabel( forced ) } )}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content>
			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="allowUserOverride">{m.appearance_allow()}</Field.Label>
					<Field.Description>{m.appearance_allow_desc()}</Field.Description>
				</Field.Content>
				<Switch id="allowUserOverride" name="allowUserOverride" bind:checked={$values.allowUserOverride} />
			</Field.Field>
		</Card.Content>
	</Card.Root>

	<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
</form>
