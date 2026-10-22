<script lang="ts">
	import { OutcomeBadge, SignInList } from '#lib/components/sign-ins/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { SIGN_IN_OUTCOMES, type SignInRow } from '#lib/sign-ins.js'

	// Attempts as the log stores them; the admin page lists them in a DataTable.
	const at = ( minutes : number ) => new Date( Date.UTC( 2026, 9, 21, 9 ) - minutes * 60_000 ).toISOString()
	const row = ( id : string, minutes : number, outcome : string, method : string, ip : string, userAgent : string ) : SignInRow => ( { id, at: at( minutes ), userId: 'u', name: 'Ada', email: 'ada@example.test', outcome, method, ip, userAgent } )
	const entries = [
		row( '1', 5, 'success', 'password', '203.0.113.7', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' ),
		row( '2', 90, 'success', 'google', '198.51.100.4', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' ),
		row( '3', 300, 'wrong-password', 'password', '192.0.2.66', 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0' ),
		row( '4', 301, 'locked', 'password', '192.0.2.66', 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0' )
	]
</script>

<svelte:head>
	<title>{m.signins_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.signins_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_signins_desc()}</p>
</div>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>SignInList · {m.signins_mine()}</Card.Title>
		<Card.Description>{m.signins_mine_desc()}</Card.Description>
	</Card.Header>
	<Card.Content><SignInList {entries} /></Card.Content>
</Card.Root>

<Card.Root class="max-w-xl">
	<Card.Header><Card.Title>OutcomeBadge</Card.Title></Card.Header>
	<Card.Content class="flex flex-wrap gap-2">
		{#each SIGN_IN_OUTCOMES as outcome ( outcome )}<OutcomeBadge {outcome} />{/each}
	</Card.Content>
</Card.Root>
