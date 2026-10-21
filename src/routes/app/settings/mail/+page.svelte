<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import SendIcon from '@lucide/svelte/icons/send'
	import { toast } from 'svelte-sonner'
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { enhance as enhanceAction } from '$app/forms'
	import { SaveBar } from '$lib/components/save-bar'
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Select from '$lib/components/ui/select'
	import { Spinner } from '$lib/components/ui/spinner'
	import { MAIL_SECURITY, mailSettingsSchema, SECURITY_PORT, securityLabel, type MailSecurity } from '$lib/mail'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const form = superForm( data.form, {
		id        : 'mail',
		validators: valibot( mailSettingsSchema ),
		resetForm : false,
		onUpdated : ( { form: updated } ) => {
			if ( updated.valid && updated.message )
				toast.success( updated.message )
		}
	} )
	const { form: values, errors, tainted, submitting, enhance } = form
	const shown = ( messages ?: string[] ) => messages?.map( ( text ) => ( { message: text } ) )

	const dirty = $derived( form.isTainted( $tainted ) )
	let testing = $state( false )

	// A port still at the old security's usual number follows the new one's.
	function setSecurity( next : MailSecurity ) {
		if ( $values.port === SECURITY_PORT[ $values.security ] )
			$values.port = SECURITY_PORT[ next ]

		$values.security = next
	}
</script>

<svelte:head>
	<title>{m.mail_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.mail_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.mail_desc()}</p>
</div>

<div class="flex max-w-3xl flex-col gap-6 pb-24">
	{#if !data.configured}
		<Alert>
			<AlertTitle>{m.mail_off_title()}</AlertTitle>
			<AlertDescription>{data.dev ? m.mail_off_dev() : m.mail_off_desc()}</AlertDescription>
		</Alert>
	{/if}

	<form method="POST" action="?/save" use:enhance novalidate>
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.mail_server()}</Card.Title>
				<Card.Description>{m.mail_server_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<Field.Group>
					<div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
						<Field.Field data-invalid={$errors.host ? true : undefined}>
							<Field.Label for="mail-host">{m.mail_host()}</Field.Label>
							<Input id="mail-host" name="host" autocomplete="off" placeholder="smtp.example.com" bind:value={$values.host} aria-invalid={$errors.host ? true : undefined} />
							<Field.Error errors={shown( $errors.host )} />
						</Field.Field>
						<Field.Field data-invalid={$errors.port ? true : undefined}>
							<Field.Label for="mail-port">{m.mail_port()}</Field.Label>
							<Input id="mail-port" name="port" type="number" inputmode="numeric" min="1" max="65535" bind:value={$values.port} aria-invalid={$errors.port ? true : undefined} />
							<Field.Error errors={shown( $errors.port )} />
						</Field.Field>
					</div>

					<Field.Field>
						<Field.Label for="mail-security">{m.mail_security()}</Field.Label>
						<Select.Root type="single" name="security" bind:value={() => $values.security, ( next ) => setSecurity( next as MailSecurity )}>
							<Select.Trigger id="mail-security" class="w-full sm:w-72">{securityLabel( $values.security )}</Select.Trigger>
							<Select.Content>
								{#each MAIL_SECURITY as security ( security )}
									<Select.Item value={security} label={securityLabel( security )}>{securityLabel( security )}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<Field.Description>{m.mail_security_desc()}</Field.Description>
					</Field.Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field data-invalid={$errors.username ? true : undefined}>
							<Field.Label for="mail-username">{m.mail_username()}</Field.Label>
							<Input id="mail-username" name="username" autocomplete="off" bind:value={$values.username} aria-invalid={$errors.username ? true : undefined} />
							<Field.Error errors={shown( $errors.username )} />
						</Field.Field>
						<Field.Field data-invalid={$errors.password ? true : undefined}>
							<Field.Label for="mail-password">{m.mail_password()}</Field.Label>
							<Input id="mail-password" name="password" type="password" autocomplete="new-password" placeholder={data.hasPassword ? '••••••••' : ''} bind:value={$values.password} aria-invalid={$errors.password ? true : undefined} />
							<Field.Description>{data.hasPassword ? m.mail_password_kept() : m.mail_password_desc()}</Field.Description>
							<Field.Error errors={shown( $errors.password )} />
						</Field.Field>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field data-invalid={$errors.fromName ? true : undefined}>
							<Field.Label for="mail-from-name">{m.mail_from_name()}</Field.Label>
							<Input id="mail-from-name" name="fromName" bind:value={$values.fromName} aria-invalid={$errors.fromName ? true : undefined} />
							<Field.Error errors={shown( $errors.fromName )} />
						</Field.Field>
						<Field.Field data-invalid={$errors.fromEmail ? true : undefined}>
							<Field.Label for="mail-from-email">{m.mail_from_email()}</Field.Label>
							<Input id="mail-from-email" name="fromEmail" type="email" placeholder="hello@example.com" bind:value={$values.fromEmail} aria-invalid={$errors.fromEmail ? true : undefined} />
							<Field.Error errors={shown( $errors.fromEmail )} />
						</Field.Field>
					</div>
				</Field.Group>
			</Card.Content>
		</Card.Root>

		<SaveBar show={dirty} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />
	</form>

	<!-- Through the saved settings, so it's off while there are unsaved changes. -->
	<form
		method="POST"
		action="?/test"
		use:enhanceAction={() => {
			testing = true

			return async( { result } ) => {
				testing = false

				if ( result.type === 'success' )
					toast.success( String( result.data?.test ) )
				else if ( result.type === 'failure' )
					toast.error( String( result.data?.test ) )
			}
		}}
	>
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.mail_test_title()}</Card.Title>
				<Card.Description>{m.mail_test_card_desc()}</Card.Description>
				<Card.Action>
					<Button type="submit" variant="outline" disabled={testing || dirty || ( !data.configured && !data.dev )}>
						{#if testing}<Spinner data-icon="inline-start" />{:else}<SendIcon data-icon="inline-start" />{/if}
						{m.mail_test_send()}
					</Button>
				</Card.Action>
			</Card.Header>
		</Card.Root>
	</form>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.mail_templates()}</Card.Title>
			<Card.Description>{m.mail_templates_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<ul class="divide-y border-y">
				{#each data.templates as template ( template.key )}
					<li>
						<a href="/app/settings/mail/{template.key}" class="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="flex items-center gap-2 text-sm font-medium">
									{template.label}
									{#if template.customised}<Badge variant="secondary">{m.mail_customised()}</Badge>{/if}
								</span>
								<span class="truncate text-sm text-muted-foreground">{template.description}</span>
							</span>
							<ChevronRightIcon class="text-muted-foreground" />
						</a>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
</div>
