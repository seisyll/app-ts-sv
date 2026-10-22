<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { invalidateAll } from '$app/navigation'
	import { RichEditor } from '#lib/components/editor/index.js'
	import { SaveBar } from '#lib/components/save-bar/index.js'
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Field from '#lib/components/ui/field/index.js'
	import type { RichText } from '#lib/editor/schema.js'
	import { languageName } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import { getLocale } from '#lib/paraglide/runtime.js'
	import { sitePageSchema } from './schema'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		id        : 'site-page',
		// The body is a document, not a string: posted as JSON.
		dataType  : 'json',
		validators: valibot( sitePageSchema ),
		resetForm : false,
		onUpdated : async( { form: updated } ) => {
			if ( updated.valid && updated.message ) {
				toast.success( updated.message )
				// "Written" follows what was saved.
				await invalidateAll()
			}
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const dirty = $derived( form.isTainted( $tainted ) )
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{data.title} · {m.site_settings_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<Button href="/app/settings/site" variant="ghost" size="sm" class="self-start">
		<ArrowLeftIcon data-icon="inline-start" />
		{m.site_settings_title()}
	</Button>
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="flex flex-col gap-1">
			<h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight">
				{data.title}
				<Badge variant={data.written ? 'secondary' : 'outline'}>{data.written ? m.site_page_written() : m.site_page_not_written()}</Badge>
			</h1>
			<p class="text-sm text-muted-foreground">{m.site_page_language( { language: languageName( getLocale() ) } )}</p>
		</div>
		<Button href="/{data.key}" target="_blank" variant="outline" size="sm">
			{m.site_view_page()}
			<ExternalLinkIcon data-icon="inline-end" />
		</Button>
	</div>
</div>

<form method="POST" use:enhance novalidate class="max-w-3xl pb-24">
	<Field.Field data-invalid={$errors.body ? true : undefined}>
		<RichEditor label={data.title} bind:value={() => $values.body as RichText, ( next ) => ( $values.body = next )} invalid={!!$errors.body} />
		<Field.Description>{m.site_page_hint()}</Field.Description>
		<Field.Error errors={shown( $errors.body as string[] | undefined )} />
	</Field.Field>

	<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
</form>
