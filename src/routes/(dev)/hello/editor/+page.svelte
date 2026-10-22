<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { RichEditor, RichText, type EditorVariable } from '#lib/components/editor/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js'
	import type { RichText as RichTextDoc } from '#lib/editor/schema.js'
	import { errorMessage, http, isHttpError } from '#lib/http.js'
	import { m } from '#lib/paraglide/messages.js'

	// The editor, then what the SERVER makes of it: /api/hello/editor validates with
	// richTextSchema and renders for the app and for an email. Images come from the
	// playground's mock library.
	const variables : EditorVariable[] = [
		{ name: 'customer_name', label: m.demo_editor_var_name() },
		{ name: 'invoice_total', label: m.demo_editor_var_total() },
		{ name: 'invoice_link', label: m.demo_editor_var_link() }
	]

	let content = $state<RichTextDoc | null>( {
		type   : 'doc',
		content: [
			{ type: 'heading', attrs: { level: 2 }, content: [ { type: 'text', text: 'Your invoice is ready' } ] },
			{ type: 'paragraph', content: [ { type: 'text', text: 'Hi ' }, { type: 'variable', attrs: { name: 'customer_name' } }, { type: 'text', text: ', thanks for your order. The total is ' }, { type: 'variable', attrs: { name: 'invoice_total' } }, { type: 'text', text: '.' } ] },
			{ type: 'bulletList', content: [
				{ type: 'listItem', content: [ { type: 'paragraph', content: [ { type: 'text', marks: [ { type: 'bold' } ], text: 'Pay' }, { type: 'text', text: ' within 14 days' } ] } ] },
				{ type: 'listItem', content: [ { type: 'paragraph', content: [ { type: 'text', text: 'Questions? ' }, { type: 'text', marks: [ { type: 'link', attrs: { href: 'mailto:help@example.test' } } ], text: 'Write to us' } ] } ] }
			] },
			{ type: 'image', attrs: { src: '/api/hello/media/3', alt: 'Orchard', width: 320, align: 'center' } },
			{ type: 'paragraph', attrs: { textAlign: 'center' }, content: [ { type: 'text', marks: [ { type: 'italic' } ], text: 'Select the image to resize or align it.' } ] }
		]
	} )

	let saved = $state<{ content : RichTextDoc, html : string, email : string }>()
	let saving = $state( false )
	let output = $state( 'html' )
	let refusal = $state( '' )

	async function save() {
		saving = true

		try {
			saved = await http.post( '/api/hello/editor', { content } )
			toast.success( m.demo_editor_saved() )
		} catch ( caught ) {
			toast.error( errorMessage( caught ) )
		} finally {
			saving = false
		}
	}

	// Bypasses the editor: a document with a javascript: link, sent straight to the server.
	async function sendUnsafe() {
		try {
			await http.post( '/api/hello/editor', { content: { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: 'click', marks: [ { type: 'link', attrs: { href: 'javascript:alert(1)' } } ] } ] } ] } } )
		} catch ( caught ) {
			refusal = JSON.stringify( isHttpError( caught ) ? caught.data : String( caught ), null, 2 )
		}
	}
</script>

<svelte:head>
	<title>{m.demo_editor_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_editor_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_editor_desc()}</p>
</div>

<Card.Root>
	<Card.Content class="flex flex-col gap-4">
		<RichEditor label={m.demo_editor_title()} bind:value={content} {variables} mediaEndpoint="/api/hello/media" />
		<div class="flex flex-wrap gap-2">
			<Button onclick={save} disabled={saving}>{#if saving}<Spinner data-icon="inline-start" />{/if}{m.demo_editor_save()}</Button>
			<Button variant="outline" onclick={sendUnsafe}>{m.demo_editor_unsafe()}</Button>
		</div>
		{#if refusal}<pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs">{refusal}</pre>{/if}
	</Card.Content>
</Card.Root>

{#if saved}
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.demo_editor_output()}</Card.Title>
			<Card.Action>
				<ToggleGroup.Root type="single" variant="outline" size="sm" value={output} onValueChange={( next ) => next && ( output = next )}>
					<ToggleGroup.Item value="html">HTML</ToggleGroup.Item>
					<ToggleGroup.Item value="email">Email</ToggleGroup.Item>
					<ToggleGroup.Item value="json">JSON</ToggleGroup.Item>
				</ToggleGroup.Root>
			</Card.Action>
		</Card.Header>
		<Card.Content>
			{#if output === 'html'}
				<RichText html={saved.html} />
			{:else if output === 'email'}
				<!-- Sandboxed ( no scripts ), shown as a mail client would, without the app's CSS.
				     allow-same-origin only so its images may load from this localhost dev server. -->
				<iframe title="Email" sandbox="allow-same-origin" srcdoc={saved.email} class="h-[28rem] w-full rounded-md border bg-white"></iframe>
			{:else}
				<pre class="max-h-[28rem] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify( saved.content, null, 2 )}</pre>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
