<script lang="ts">
	import './rich-text.css'

	// Rich text for reading. `html` must come from renderRichText() ( #lib/editor/render ): it is
	// rendered from a document that passed richTextSchema, so it is escaped and its URLs vetted.
	// Never hand it HTML from anywhere else.
	let { html, class: className } : { html : string, class ?: string } = $props()
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderRichText() output only ( see above ) -->
<div class={[ 'rich-text', className ]}>{@html html}</div>
