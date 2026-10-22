<script lang="ts">
	import InboxIcon from '@lucide/svelte/icons/inbox'
	import MailPlusIcon from '@lucide/svelte/icons/mail-plus'
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { http } from '$lib/http'
	import { relativeTime } from '$lib/notifications'
	import { m } from '$lib/paraglide/messages'
	import type { OutboxMail } from '$lib/server/mail/outbox'
	import { cn } from '$lib/utils'

	// The dev outbox: every email the app sent while running `vite dev` — password resets,
	// invites, notification emails — plus samples of each on demand. Real ones need a
	// signed-in workspace; the samples don't.
	let mails = $state<OutboxMail[]>( [] )
	let selected = $state<string>()
	let view = $state( 'html' )

	const open = $derived( mails.find( ( mail ) => mail.id === selected ) ?? mails[ 0 ] )

	async function load( request : Promise<OutboxMail[]> ) {
		mails = await request
		selected = mails[ 0 ]?.id
	}

	$effect( () => {
		void load( http.get( '/api/hello/mail' ) )
	} )
</script>

<svelte:head>
	<title>{m.demo_mail_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_mail_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_mail_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_mail_outbox()}</Card.Title>
		<Card.Description>{m.demo_mail_outbox_desc()}</Card.Description>
		<Card.Action class="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" onclick={() => load( http.get( '/api/hello/mail' ) )}><RefreshCwIcon data-icon="inline-start" />{m.demo_mail_refresh()}</Button>
			<Button variant="outline" size="sm" onclick={() => load( http.post( '/api/hello/mail' ) )}><MailPlusIcon data-icon="inline-start" />{m.demo_mail_samples()}</Button>
			<Button variant="outline" size="sm" disabled={!mails.length} onclick={() => load( http.delete( '/api/hello/mail' ) )}><Trash2Icon data-icon="inline-start" />{m.demo_mail_clear()}</Button>
		</Card.Action>
	</Card.Header>
	<Card.Content>
		{#if open}
			<div class="grid gap-4 md:grid-cols-[18rem_1fr]">
				<ul class="flex max-h-[36rem] flex-col gap-1 overflow-y-auto" aria-label={m.demo_mail_outbox()}>
					{#each mails as mail ( mail.id )}
						<li>
							<button
								type="button"
								aria-current={mail.id === open.id ? 'true' : undefined}
								class={cn( 'flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none', mail.id === open.id && 'bg-muted' )}
								onclick={() => ( selected = mail.id )}
							>
								<span class="truncate font-medium">{mail.subject}</span>
								<span class="flex items-center gap-2 text-xs text-muted-foreground">
									<span class="truncate">{mail.to}</span>
									<span class="shrink-0">· {relativeTime( mail.at )}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>

				<div class="flex min-w-0 flex-col gap-3">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
							<dt class="text-muted-foreground">{m.demo_mail_to()}</dt>
							<dd class="truncate">{open.to}</dd>
							<dt class="text-muted-foreground">{m.mail_subject()}</dt>
							<dd>{open.subject}</dd>
						</dl>
						<div class="flex items-center gap-2">
							<Badge variant={open.sent ? 'default' : 'outline'}>{open.sent ? m.demo_mail_sent() : m.demo_mail_kept()}</Badge>
							<ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={() => view, ( next ) => ( view = next || view )}>
								<ToggleGroup.Item value="html">HTML</ToggleGroup.Item>
								<ToggleGroup.Item value="text">{m.demo_mail_text()}</ToggleGroup.Item>
							</ToggleGroup.Root>
						</div>
					</div>
					{#if view === 'html'}
						<!-- Sandboxed ( no scripts ), as a mail client would show it. allow-same-origin
						     only so its images load from this localhost dev server ( img-src 'self' ). -->
						<iframe title={open.subject} sandbox="allow-same-origin" srcdoc={open.html} class="h-[32rem] w-full rounded-md border bg-white"></iframe>
					{:else}
						<pre class="max-h-[32rem] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{open.text}</pre>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
				<InboxIcon class="size-8" />
				<p>{m.demo_mail_empty()}</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
