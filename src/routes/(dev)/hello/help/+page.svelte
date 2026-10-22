<script lang="ts">
	import { HelpLink, HelpSheet } from '#lib/components/help/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { HELP_ARTICLES } from '#lib/help/index.js'
	import { m } from '#lib/paraglide/messages.js'
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.help_title()}</Card.Title>
		<Card.Description>{m.demo_help_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		{#each HELP_ARTICLES as article ( article.id )}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<code class="w-40 text-xs text-muted-foreground">{article.id}</code>
				<HelpLink doc={article.id} />
			</div>
		{/each}
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
			<code class="w-40 text-xs text-muted-foreground">children</code>
			<HelpLink doc="email-setup">{m.demo_help_custom()}</HelpLink>
		</div>
	</Card.Content>
</Card.Root>

<!-- The /app layout mounts it once; here, for the playground. -->
<HelpSheet />
