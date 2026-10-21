<script lang="ts">
	import { superForm } from 'sveltekit-superforms'
	import { valibot } from 'sveltekit-superforms/adapters'
	import { Alert, AlertDescription } from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Select from '$lib/components/ui/select'
	import { Spinner } from '$lib/components/ui/spinner'
	import { Switch } from '$lib/components/ui/switch'
	import { Textarea } from '$lib/components/ui/textarea'
	import { SaveBar } from '$lib/components/save-bar'
	import { apiForm } from '$lib/forms'
	import { http, isHttpError } from '$lib/http'
	import { m } from '$lib/paraglide/messages'
	import { newsletterSchema, PLANS, profileSchema, type Profile } from './schema'

	let { data } = $props()

	// Field.Error takes [ { message } ]; superforms holds string[].
	const shown = ( messages ?: string[] ) => messages?.map( ( message ) => ( { message } ) )

	// ── API form: browser validation, PUT to a JSON endpoint that re-validates.
	let failing = $state( false )

	const profile = apiForm( profileSchema, {
		id     : 'profile',
		initial: { name: 'Ada Lovelace', email: 'ada@example.test', website: '', seats: 3, plan: 'pro', bio: '', newsletter: true },
		submit : ( values ) => http.put( `/api/hello/profile${ failing ? '?fail=1' : '' }`, values ),
		success: m.demo_forms_saved()
	} )
	const { form: values, errors, constraints, tainted, submitting, enhance } = profile

	const planLabel = { free: 'Free', pro: 'Pro', team: 'Team' }

	// Bypasses the browser's validation entirely, to show the endpoint enforces the schema.
	let serverCheck = $state( '' )

	async function sendInvalid() {
		try {
			await http.put( '/api/hello/profile', { name: '', email: 'not-an-email', seats: 0 } )
		} catch ( caught ) {
			serverCheck = JSON.stringify( isHttpError( caught ) ? caught.data : caught, null, 2 )
		}
	}

	// ── Form action: a real <form> post, enhanced; works with JavaScript off.
	// svelte-ignore state_referenced_locally
	const newsletter = superForm( data.newsletter, { validators: valibot( newsletterSchema ), resetForm: true } )
	const { form: nlValues, errors: nlErrors, message: nlMessage, submitting: nlSubmitting, enhance: nlEnhance } = newsletter
</script>

<svelte:head>
	<title>{m.demo_forms_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_forms_title()}</h1>
	<p class="text-muted-foreground text-sm">{m.demo_forms_desc()}</p>
</div>

<form method="POST" use:enhance novalidate>
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.demo_forms_api_title()}</Card.Title>
			<Card.Description>{m.demo_forms_api_desc()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<Field.Group>
				<div class="grid gap-6 sm:grid-cols-2">
					<Field.Field data-invalid={$errors.name ? true : undefined}>
						<Field.Label for="name">{m.demo_forms_name()}</Field.Label>
						<Input id="name" name="name" bind:value={$values.name} aria-invalid={$errors.name ? true : undefined} {...$constraints.name} />
						<Field.Error errors={shown( $errors.name )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.email ? true : undefined}>
						<Field.Label for="email">{m.demo_forms_email()}</Field.Label>
						<Input id="email" name="email" type="email" bind:value={$values.email} aria-invalid={$errors.email ? true : undefined} {...$constraints.email} />
						<Field.Description>{m.demo_forms_email_hint()}</Field.Description>
						<Field.Error errors={shown( $errors.email )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.website ? true : undefined}>
						<Field.Label for="website">{m.demo_forms_website()}</Field.Label>
						<Input id="website" name="website" type="url" placeholder="https://" bind:value={$values.website} aria-invalid={$errors.website ? true : undefined} />
						<Field.Error errors={shown( $errors.website )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.seats ? true : undefined}>
						<Field.Label for="seats">{m.demo_forms_seats()}</Field.Label>
						<Input id="seats" name="seats" type="number" bind:value={$values.seats} aria-invalid={$errors.seats ? true : undefined} {...$constraints.seats} />
						<Field.Error errors={shown( $errors.seats )} />
					</Field.Field>

					<Field.Field data-invalid={$errors.plan ? true : undefined}>
						<Field.Label for="plan">{m.demo_forms_plan()}</Field.Label>
						<Select.Root type="single" name="plan" bind:value={() => $values.plan, ( value ) => ( $values.plan = value as Profile['plan'] )}>
							<Select.Trigger id="plan" class="w-full">{planLabel[ $values.plan ]}</Select.Trigger>
							<Select.Content>
								{#each PLANS as plan ( plan )}
									<Select.Item value={plan} label={planLabel[ plan ]}>{planLabel[ plan ]}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<Field.Error errors={shown( $errors.plan )} />
					</Field.Field>
				</div>

				<Field.Field data-invalid={$errors.bio ? true : undefined}>
					<Field.Label for="bio">{m.demo_forms_bio()}</Field.Label>
					<Textarea id="bio" name="bio" rows={3} bind:value={$values.bio} aria-invalid={$errors.bio ? true : undefined} />
					<Field.Description>{m.demo_forms_bio_hint( { count: $values.bio.length } )}</Field.Description>
					<Field.Error errors={shown( $errors.bio )} />
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Field.Content>
						<Field.Label for="newsletter">{m.demo_forms_newsletter()}</Field.Label>
						<Field.Description>{m.demo_forms_newsletter_hint()}</Field.Description>
					</Field.Content>
					<Switch id="newsletter" bind:checked={$values.newsletter} />
				</Field.Field>
			</Field.Group>
		</Card.Content>
		<Card.Footer class="flex flex-wrap items-center gap-4">
			<Field.Field orientation="horizontal" class="w-auto">
				<Switch id="failing" bind:checked={failing} />
				<Field.Label for="failing">{m.demo_forms_failing()}</Field.Label>
			</Field.Field>
			<Button variant="outline" size="sm" onclick={sendInvalid}>{m.demo_forms_server_check()}</Button>
		</Card.Footer>
	</Card.Root>

	<SaveBar show={profile.isTainted( $tainted )} saving={$submitting} saveType="submit" ondiscard={() => profile.reset()} />
</form>

{#if serverCheck}
	<Alert>
		<AlertDescription>
			<p>{m.demo_forms_server_check_result()}</p>
			<pre class="bg-muted mt-2 overflow-x-auto rounded-md p-3 text-xs">{serverCheck}</pre>
		</AlertDescription>
	</Alert>
{/if}

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_forms_action_title()}</Card.Title>
		<Card.Description>{m.demo_forms_action_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/subscribe" use:nlEnhance novalidate class="flex flex-wrap items-start gap-3">
			<Field.Field data-invalid={$nlErrors.email ? true : undefined} class="min-w-64 flex-1">
				<Field.Label for="newsletter-email" class="sr-only">{m.demo_forms_email()}</Field.Label>
				<Input id="newsletter-email" name="email" type="email" placeholder="you@example.test" bind:value={$nlValues.email} aria-invalid={$nlErrors.email ? true : undefined} />
				<Field.Error errors={shown( $nlErrors.email )} />
			</Field.Field>
			<Button type="submit" disabled={$nlSubmitting}>
				{#if $nlSubmitting}
					<Spinner data-icon="inline-start" />
				{/if}
				{m.demo_forms_subscribe()}
			</Button>
		</form>
		<!-- Inline, not a toast: it must also show when JavaScript is off. -->
		{#if $nlMessage}
			<p role="status" class="text-muted-foreground mt-3 text-sm">{$nlMessage}</p>
		{/if}
	</Card.Content>
</Card.Root>
