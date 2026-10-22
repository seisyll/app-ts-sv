<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { APP } from '#lib/config.js'
	import { date } from '#lib/format.js'
	import { moduleLabel } from '#lib/modules.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data } = $props()
</script>

<svelte:head>
	<title>{m.app_nav_settings()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.app_nav_settings()}</h1>
	<p class="text-muted-foreground text-sm">{m.app_settings_desc()}</p>
</div>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>{data.tenant.name}</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-sm">
			<dt class="text-muted-foreground">{m.app_settings_tenancy()}</dt>
			<dd><Badge variant="secondary">{data.tenancy}</Badge></dd>
			<dt class="text-muted-foreground">{m.app_settings_signup()}</dt>
			<dd><Badge variant={data.signUp ? 'default' : 'outline'}>{data.signUp ? m.app_on() : m.app_off()}</Badge></dd>
		</dl>
	</Card.Content>
</Card.Root>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>{m.modules_title()}</Card.Title>
		<Card.Description>{m.modules_desc( { client: data.client } )}</Card.Description>
	</Card.Header>
	<Card.Content>
		<dl class="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 text-sm">
			{#each data.modules as module ( module.id )}
				<dt>{moduleLabel( module.id )}</dt>
				<dd>
					{#if module.state === 'on'}
						<Badge>{m.app_on()}</Badge>
					{:else if module.state === 'off'}
						<Badge variant="outline">{m.modules_off_here()}</Badge>
					{:else}
						<Badge variant="secondary">{m.modules_absent()}</Badge>
					{/if}
				</dd>
			{/each}
		</dl>
	</Card.Content>
</Card.Root>

{#if data.jobs}
	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title>{m.jobs_title()}</Card.Title>
			<Card.Description>{m.jobs_desc( { zone: APP.timeZone } )}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ul class="flex flex-col divide-y text-sm">
				{#each data.jobs as job ( job.name )}
					<li class="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
						<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<span class="font-medium">{job.label}</span>
							<code class="text-xs text-muted-foreground">{job.schedule}</code>
						</div>
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							{#if job.next}<span>{m.jobs_next()}: {date( job.next )}</span>{/if}
							<span class="flex items-center gap-1.5">
								{m.jobs_last()}:
								{#if !job.last}
									{m.jobs_never()}
								{:else if job.last.ok === null}
									<Badge variant="secondary">{m.jobs_running()}</Badge>
								{:else if job.last.ok}
									{date( job.last.finishedAt ?? job.last.startedAt )} · {m.jobs_ok( { count: job.last.count ?? 0 } )}
								{:else}
									<Badge variant="destructive" title={job.last.error ?? undefined}>{m.jobs_failed()}</Badge>
									{date( job.last.finishedAt ?? job.last.startedAt )}
								{/if}
							</span>
						</div>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
{/if}
