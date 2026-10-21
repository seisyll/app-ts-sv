<script lang="ts">
	import * as v from 'valibot'
	import { apiForm } from '$lib/forms'

	// Minimal apiForm consumer for forms.svelte.test.ts.
	let { submit, initial } : { submit : ( data : unknown ) => Promise<unknown>, initial ?: { name ?: string, email ?: string } } = $props()

	const schema = v.object( {
		name : v.pipe( v.string(), v.trim(), v.nonEmpty() ),
		email: v.pipe( v.string(), v.email() )
	} )

	// svelte-ignore state_referenced_locally
	const form = apiForm( schema, { initial, submit, success: 'Saved' } )
	const { form: values, errors, tainted, enhance } = form
</script>

<form method="POST" use:enhance novalidate>
	<label>Name <input name="name" bind:value={$values.name} /></label>
	{#if $errors.name}
		<p data-error="name">{$errors.name.join( ' ' )}</p>
	{/if}
	<label>Email <input name="email" bind:value={$values.email} /></label>
	{#if $errors.email}
		<p data-error="email">{$errors.email.join( ' ' )}</p>
	{/if}
	<p data-state>{form.isTainted( $tainted ) ? 'dirty' : 'clean'}</p>
	<button type="submit">Save</button>
</form>
