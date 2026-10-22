<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { enhance as enhanceAction } from '$app/forms'
	import { RichEditor } from '$lib/components/editor'
	import { SaveBar } from '$lib/components/save-bar'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import type { RichText } from '$lib/editor/schema'
	import { mailTemplateSchema } from '$lib/mail'
	import { m } from '$lib/paraglide/messages'
	import { getLocale } from '$lib/paraglide/runtime'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		id        : 'mail-template',
		// The body is a document, not a string: posted as JSON.
		dataType  : 'json',
		validators: valibot( mailTemplateSchema ),
		resetForm : false,
		onUpdated : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )

	// The picker is the media library's: that module on, in this build and for this workspace.
	const images = $derived( MODULES.media && data.modules.includes( 'media' ) )

	const dirty = $derived( form.isTainted( $tainted ) )
	const language = $derived( new Intl.DisplayNames( [ getLocale() ], { type: 'language' } ).of( getLocale() ) ?? getLocale() )
</script>

<svelte:head>
	<title>{data.label} · {m.mail_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<Button href="/app/settings/mail" variant="ghost" size="sm" class="self-start">
		<ArrowLeftIcon data-icon="inline-start" />
		{m.mail_title()}
	</Button>
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{data.label}</h1>
		<p class="text-sm text-muted-foreground">{data.description}</p>
	</div>
</div>

<div class="grid max-w-6xl gap-6 pb-24 lg:grid-cols-2">
	<form method="POST" action="?/save" use:enhance novalidate>
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.mail_template_wording()}</Card.Title>
				<Card.Description>{m.mail_template_language( { language } )}</Card.Description>
				{#if data.customised}
					<Card.Action>
						<Button type="submit" form="mail-template-reset" variant="outline" size="sm">
							<RotateCcwIcon data-icon="inline-start" />
							{m.mail_template_reset()}
						</Button>
					</Card.Action>
				{/if}
			</Card.Header>
			<Card.Content>
				<Field.Group>
					<Field.Field data-invalid={$errors.subject ? true : undefined}>
						<Field.Label for="mail-subject">{m.mail_subject()}</Field.Label>
						<Input id="mail-subject" bind:value={$values.subject} aria-invalid={$errors.subject ? true : undefined} />
						<Field.Description>{m.mail_subject_desc( { variables: data.variables.map( ( variable ) => `{{${ variable.name }}}` ).join( ' ' ) } )}</Field.Description>
						<Field.Error errors={shown( $errors.subject )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.body ? true : undefined}>
						<RichEditor label={m.mail_body()} bind:value={() => $values.body as RichText, ( next ) => ( $values.body = next )} variables={data.variables} {images} invalid={!!$errors.body} />
						<Field.Description>{m.mail_body_desc()}{#if images} {m.mail_body_images()}{/if}</Field.Description>
						<Field.Error errors={shown( $errors.body as string[] | undefined )} />
					</Field.Field>
				</Field.Group>
			</Card.Content>
		</Card.Root>

		<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
	</form>

	<Card.Root class="self-start">
		<Card.Header>
			<Card.Title>{m.mail_preview()}</Card.Title>
			<Card.Description>{m.mail_preview_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<p class="text-sm"><span class="text-muted-foreground">{m.mail_subject()}:</span> {data.preview.subject}</p>
			<!-- Sandboxed ( no scripts ), shown as a mail client would, without the app's CSS.
			     allow-same-origin only so the page's img-src 'self' covers its images over plain
			     http ( dev ); with no scripts the frame still can't act. -->
			<iframe title={m.mail_preview()} sandbox="allow-same-origin" srcdoc={data.preview.html} class="h-[32rem] w-full rounded-md border bg-white"></iframe>
		</Card.Content>
	</Card.Root>
</div>

<form id="mail-template-reset" method="POST" action="?/reset" use:enhanceAction={() => async( { update } ) => {
	await update()
	form.reset( { data: data.form.data, newState: data.form.data } )
	toast.success( m.mail_template_reset_done() )
}} hidden></form>
