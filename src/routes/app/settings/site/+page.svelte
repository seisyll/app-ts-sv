<script lang="ts">
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
	import PencilIcon from '@lucide/svelte/icons/pencil'
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { SaveBar } from '$lib/components/save-bar'
	import { NetworkIcon } from '$lib/components/site'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as InputGroup from '$lib/components/ui/input-group'
	import * as Item from '$lib/components/ui/item'
	import { m } from '$lib/paraglide/messages'
	import { SOCIAL_NETWORK_IDS, SOCIAL_NETWORKS, siteSettingsSchema } from '$lib/site'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		// The links are a nested object: posted as JSON.
		dataType  : 'json',
		validators: valibot( siteSettingsSchema ),
		resetForm : false,
		onUpdated : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const dirty = $derived( form.isTainted( $tainted ) )
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )
</script>

<svelte:head>
	<title>{m.site_settings_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{m.site_settings_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.site_settings_desc()}</p>
	</div>
	<Button href="/" target="_blank" variant="outline" size="sm">
		{m.site_view()}
		<ExternalLinkIcon data-icon="inline-end" />
	</Button>
</div>

<div class="flex max-w-3xl flex-col gap-6 pb-24">
	{#if data.pages.length}
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.site_pages()}</Card.Title>
				<Card.Description>{m.site_pages_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<Item.Group class="rounded-lg border">
					{#each data.pages as page, index ( page.key )}
						{#if index}<Item.Separator />{/if}
						<Item.Root size="sm">
							<Item.Content>
								<Item.Title>
									{page.title}
									<Badge variant={page.written ? 'secondary' : 'outline'}>{page.written ? m.site_page_written() : m.site_page_not_written()}</Badge>
								</Item.Title>
								<Item.Description><a href="/{page.key}" target="_blank" class="underline-offset-4 hover:underline">/{page.key}</a></Item.Description>
							</Item.Content>
							<Item.Actions>
								<Button href="/app/settings/site/{page.key}" variant="outline" size="sm">
									<PencilIcon data-icon="inline-start" />
									{m.site_page_edit()}
								</Button>
							</Item.Actions>
						</Item.Root>
					{/each}
				</Item.Group>
			</Card.Content>
		</Card.Root>
	{/if}

	<form method="POST" use:enhance novalidate class="flex flex-col gap-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.site_footer()}</Card.Title>
				<Card.Description>{m.site_footer_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<Field.Group>
					<Field.Field data-invalid={$errors.tagline ? true : undefined}>
						<Field.Label for="site-tagline">{m.site_tagline_label()}</Field.Label>
						<Input id="site-tagline" bind:value={$values.tagline} placeholder={m.site_tagline()} aria-invalid={$errors.tagline ? true : undefined} />
						<Field.Description>{m.site_tagline_desc()}</Field.Description>
						<Field.Error errors={shown( $errors.tagline )} />
					</Field.Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field data-invalid={$errors.email ? true : undefined}>
							<Field.Label for="site-email">{m.auth_email()}</Field.Label>
							<Input id="site-email" type="email" bind:value={$values.email} placeholder="hello@example.com" aria-invalid={$errors.email ? true : undefined} />
							<Field.Error errors={shown( $errors.email )} />
						</Field.Field>
						<Field.Field data-invalid={$errors.phone ? true : undefined}>
							<Field.Label for="site-phone">{m.site_phone()}</Field.Label>
							<Input id="site-phone" type="tel" bind:value={$values.phone} placeholder="+1 555 010 0100" aria-invalid={$errors.phone ? true : undefined} />
							<Field.Error errors={shown( $errors.phone )} />
						</Field.Field>
					</div>
				</Field.Group>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.site_social()}</Card.Title>
				<Card.Description>{m.site_social_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each SOCIAL_NETWORK_IDS as network ( network )}
						<Field.Field data-invalid={$errors.links?.[ network ] ? true : undefined}>
							<Field.Label for="site-{network}">{SOCIAL_NETWORKS[ network ]}</Field.Label>
							<InputGroup.Root>
								<InputGroup.Addon><NetworkIcon {network} /></InputGroup.Addon>
								<InputGroup.Input id="site-{network}" type="url" inputmode="url" bind:value={$values.links[ network ]} placeholder="https://" aria-invalid={$errors.links?.[ network ] ? true : undefined} />
							</InputGroup.Root>
							<Field.Error errors={shown( $errors.links?.[ network ] )} />
						</Field.Field>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
	</form>
</div>
