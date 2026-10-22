<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { SOCIAL_LABELS, type SocialProvider } from '#lib/social.js'
	import SocialIcon from './SocialIcon.svelte'

	/* ―― » "Continue with …" under the sign-in and sign-up forms, one per provider this
	        deployment offers. A plain form posting to /login/social, so it works without
	        JavaScript; that endpoint sends the browser on to the provider. */
	let { providers, redirectTo, action = '/login/social' } : {
		providers     : SocialProvider[]
		// Where to land after signing in ( a path in this app ).
		redirectTo ?  : string | null
		action ?      : string
	} = $props()
</script>

{#if providers.length}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-3 text-xs text-muted-foreground uppercase">
			<span class="h-px flex-1 bg-border"></span>{m.auth_or()}<span class="h-px flex-1 bg-border"></span>
		</div>
		<form method="POST" {action} class="flex flex-col gap-2">
			{#if redirectTo}<input type="hidden" name="redirectTo" value={redirectTo} />{/if}
			{#each providers as provider ( provider )}
				<Button type="submit" name="provider" value={provider} variant="outline" class="w-full">
					<SocialIcon {provider} />
					{m.auth_continue_with( { provider: SOCIAL_LABELS[ provider ] } )}
				</Button>
			{/each}
		</form>
	</div>
{/if}
