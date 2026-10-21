<script lang="ts">
	import { getLocalTimeZone, today } from '@internationalized/date'
	import { scaleBand } from 'd3-scale'
	import { BarChart } from 'layerchart'
	import { toast } from 'svelte-sonner'
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import InboxIcon from '@lucide/svelte/icons/inbox'
	import * as Accordion from '$lib/components/ui/accordion'
	import { AspectRatio } from '$lib/components/ui/aspect-ratio'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as ButtonGroup from '$lib/components/ui/button-group'
	import { Calendar } from '$lib/components/ui/calendar'
	import * as Card from '$lib/components/ui/card'
	import * as Carousel from '$lib/components/ui/carousel'
	import * as Chart from '$lib/components/ui/chart'
	import * as ContextMenu from '$lib/components/ui/context-menu'
	import * as Drawer from '$lib/components/ui/drawer'
	import * as Empty from '$lib/components/ui/empty'
	import * as HoverCard from '$lib/components/ui/hover-card'
	import * as InputOTP from '$lib/components/ui/input-otp'
	import * as Item from '$lib/components/ui/item'
	import { Label } from '$lib/components/ui/label'
	import * as Menubar from '$lib/components/ui/menubar'
	import * as NativeSelect from '$lib/components/ui/native-select'
	import * as NavigationMenu from '$lib/components/ui/navigation-menu'
	import * as Pagination from '$lib/components/ui/pagination'
	import { Progress } from '$lib/components/ui/progress'
	import * as RadioGroup from '$lib/components/ui/radio-group'
	import { Slider } from '$lib/components/ui/slider'
	import * as Tabs from '$lib/components/ui/tabs'
	import { APP } from '$lib/config'
	import { m } from '$lib/paraglide/messages'
	import { getLocale } from '$lib/paraglide/runtime'

	// The shadcn-svelte components with no home in the app yet, one card each, in the
	// current palette, style and radius ( the palette button tries the others ).

	let date = $state( today( getLocalTimeZone() ) )
	let otp = $state( '' )
	let slider = $state( 40 )
	let plan = $state( 'team' )
	let region = $state( 'eu' )

	// Six months of signups, two series: the chart reads --chart-1 and --chart-2.
	const months = Array.from( { length: 6 }, ( _, index ) => new Intl.DateTimeFormat( getLocale(), { month: 'short', timeZone: APP.timeZone } ).format( new Date( Date.UTC( 2026, index, 15 ) ) ) )
	const signups = [ 186, 305, 237, 73, 209, 214 ].map( ( web, index ) => ( { month: months[ index ], web, mobile: [ 80, 200, 120, 190, 130, 140 ][ index ] } ) )
	const chartConfig = {
		web   : { label: m.demo_ui_chart_web(), color: 'var(--chart-1)' },
		mobile: { label: m.demo_ui_chart_mobile(), color: 'var(--chart-2)' }
	} satisfies Chart.ChartConfig
</script>

<svelte:head>
	<title>{m.demo_ui_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_ui_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_ui_desc()}</p>
</div>

{#snippet section( title : string, description : string, body : import( 'svelte' ).Snippet )}
	<Card.Root>
		<Card.Header>
			<Card.Title>{title}</Card.Title>
			<Card.Description>{description}</Card.Description>
		</Card.Header>
		<Card.Content>{@render body()}</Card.Content>
	</Card.Root>
{/snippet}

<div class="grid gap-6 lg:grid-cols-2">
	{#snippet chart()}
		<Chart.Container config={chartConfig} class="aspect-auto h-60 w-full">
			<BarChart data={signups} xScale={scaleBand().padding( 0.25 )} x="month" axis="x" seriesLayout="group" series={[ { key: 'web', label: chartConfig.web.label, color: chartConfig.web.color }, { key: 'mobile', label: chartConfig.mobile.label, color: chartConfig.mobile.color } ]} />
		</Chart.Container>
	{/snippet}
	{@render section( 'Chart', m.demo_ui_chart(), chart )}

	{#snippet tabs()}
		<Tabs.Root value="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">{m.demo_ui_tab_overview()}</Tabs.Trigger>
				<Tabs.Trigger value="activity">{m.demo_ui_tab_activity()}</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview" class="pt-3 text-sm text-muted-foreground">{m.demo_ui_tab_overview_text()}</Tabs.Content>
			<Tabs.Content value="activity" class="pt-3 text-sm text-muted-foreground">{m.demo_ui_tab_activity_text()}</Tabs.Content>
		</Tabs.Root>
	{/snippet}
	{@render section( 'Tabs', m.demo_ui_tabs(), tabs )}

	{#snippet accordion()}
		<Accordion.Root type="single" value="one">
			<Accordion.Item value="one">
				<Accordion.Trigger>{m.demo_ui_faq_q1()}</Accordion.Trigger>
				<Accordion.Content>{m.demo_ui_faq_a1()}</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="two">
				<Accordion.Trigger>{m.demo_ui_faq_q2()}</Accordion.Trigger>
				<Accordion.Content>{m.demo_ui_faq_a2()}</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{/snippet}
	{@render section( 'Accordion', m.demo_ui_accordion(), accordion )}

	{#snippet calendar()}
		<Calendar type="single" bind:value={date} class="w-fit rounded-md border" captionLayout="dropdown" />
	{/snippet}
	{@render section( 'Calendar', m.demo_ui_calendar(), calendar )}

	{#snippet carousel()}
		<Carousel.Root class="mx-12 max-w-xs">
			<Carousel.Content>
				{#each [ 1, 2, 3, 4, 5 ] as n ( n )}
					<Carousel.Item>
						<AspectRatio ratio={4 / 3} class="overflow-hidden rounded-lg bg-muted">
							<img src="/api/hello/media/{n}" alt="" class="size-full object-cover" />
						</AspectRatio>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
			<Carousel.Previous />
			<Carousel.Next />
		</Carousel.Root>
	{/snippet}
	{@render section( 'Carousel · AspectRatio', m.demo_ui_carousel(), carousel )}

	{#snippet empty()}
		<Empty.Root class="border border-dashed">
			<Empty.Header>
				<Empty.Media variant="icon"><InboxIcon /></Empty.Media>
				<Empty.Title>{m.demo_ui_empty_title()}</Empty.Title>
				<Empty.Description>{m.demo_ui_empty_desc()}</Empty.Description>
			</Empty.Header>
			<Empty.Content><Button size="sm">{m.demo_ui_empty_action()}</Button></Empty.Content>
		</Empty.Root>
	{/snippet}
	{@render section( 'Empty', m.demo_ui_empty(), empty )}

	{#snippet item()}
		<Item.Group class="gap-2">
			{#each [ m.demo_ui_item_one(), m.demo_ui_item_two() ] as title ( title )}
				<Item.Root variant="outline">
					<Item.Media variant="icon"><FileTextIcon /></Item.Media>
					<Item.Content>
						<Item.Title>{title}</Item.Title>
						<Item.Description>{m.demo_ui_item_desc()}</Item.Description>
					</Item.Content>
					<Item.Actions><Button variant="outline" size="sm">{m.demo_ui_open()}</Button></Item.Actions>
				</Item.Root>
			{/each}
		</Item.Group>
	{/snippet}
	{@render section( 'Item', m.demo_ui_item(), item )}

	{#snippet inputs()}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2">
				<Label for="demo-otp">{m.demo_ui_otp()}</Label>
				<InputOTP.Root id="demo-otp" maxlength={6} bind:value={otp}>
					{#snippet children( { cells } )}
						<InputOTP.Group>
							{#each cells.slice( 0, 3 ) as cell ( cell )}<InputOTP.Slot {cell} />{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice( 3, 6 ) as cell ( cell )}<InputOTP.Slot {cell} />{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="demo-region">{m.demo_ui_native_select()}</Label>
				<NativeSelect.Root id="demo-region" bind:value={region} class="max-w-60">
					<NativeSelect.Option value="eu">{m.demo_ui_region_eu()}</NativeSelect.Option>
					<NativeSelect.Option value="us">{m.demo_ui_region_us()}</NativeSelect.Option>
					<NativeSelect.Option value="asia">{m.demo_ui_region_asia()}</NativeSelect.Option>
				</NativeSelect.Root>
			</div>
			<div class="flex flex-col gap-3">
				<Label>{m.demo_ui_slider( { value: slider } )}</Label>
				<Slider type="single" bind:value={slider} max={100} step={1} class="max-w-80" />
				<Progress value={slider} max={100} class="max-w-80" />
			</div>
			<RadioGroup.Root bind:value={plan} class="flex flex-col gap-2">
				{#each [ [ 'solo', m.demo_ui_plan_solo() ], [ 'team', m.demo_ui_plan_team() ] ] as [ value, label ] ( value )}
					<div class="flex items-center gap-2">
						<RadioGroup.Item {value} id="demo-plan-{value}" />
						<Label for="demo-plan-{value}">{label}</Label>
					</div>
				{/each}
			</RadioGroup.Root>
		</div>
	{/snippet}
	{@render section( 'InputOTP · NativeSelect · Slider · Progress · RadioGroup', m.demo_ui_inputs(), inputs )}

	{#snippet buttons()}
		<div class="flex flex-col gap-5">
			<ButtonGroup.Root>
				<Button variant="outline" size="sm" aria-label={m.table_previous_page()}><ChevronLeftIcon /></Button>
				<Button variant="outline" size="sm">{m.demo_ui_today()}</Button>
				<Button variant="outline" size="sm" aria-label={m.table_next_page()}><ChevronRightIcon /></Button>
			</ButtonGroup.Root>
			<Pagination.Root count={100} perPage={10} page={2}>
				{#snippet children( { pages, currentPage } )}
					<Pagination.Content>
						<Pagination.Item><Pagination.Previous /></Pagination.Item>
						{#each pages as page ( page.key )}
							<Pagination.Item>
								{#if page.type === 'ellipsis'}
									<Pagination.Ellipsis />
								{:else}
									<Pagination.Link {page} isActive={currentPage === page.value}>{page.value}</Pagination.Link>
								{/if}
							</Pagination.Item>
						{/each}
						<Pagination.Item><Pagination.Next /></Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/snippet}
	{@render section( 'ButtonGroup · Pagination', m.demo_ui_buttons(), buttons )}

	{#snippet menus()}
		<div class="flex flex-col gap-5">
			<Menubar.Root class="w-fit">
				<Menubar.Menu>
					<Menubar.Trigger>{m.demo_ui_menu_file()}</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.Item onclick={() => toast( m.demo_ui_menu_new() )}>{m.demo_ui_menu_new()}<Menubar.Shortcut>⌘N</Menubar.Shortcut></Menubar.Item>
						<Menubar.Item>{m.demo_ui_menu_open()}<Menubar.Shortcut>⌘O</Menubar.Shortcut></Menubar.Item>
					</Menubar.Content>
				</Menubar.Menu>
				<Menubar.Menu>
					<Menubar.Trigger>{m.demo_ui_menu_view()}</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.CheckboxItem checked>{m.demo_ui_menu_sidebar()}</Menubar.CheckboxItem>
					</Menubar.Content>
				</Menubar.Menu>
			</Menubar.Root>

			<NavigationMenu.Root>
				<NavigationMenu.List>
					<NavigationMenu.Item>
						<NavigationMenu.Trigger>{m.demo_ui_nav_product()}</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul class="grid w-64 gap-1 p-2">
								<li><NavigationMenu.Link href="/hello/data-table">DataTable</NavigationMenu.Link></li>
								<li><NavigationMenu.Link href="/hello/media">{m.media_title()}</NavigationMenu.Link></li>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/hello">{m.nav_overview()}</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<ContextMenu.Root>
				<ContextMenu.Trigger class="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{m.demo_ui_context_hint()}</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item>{m.demo_ui_menu_open()}</ContextMenu.Item>
					<ContextMenu.Item>{m.demo_ui_menu_new()}</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</div>
	{/snippet}
	{@render section( 'Menubar · NavigationMenu · ContextMenu', m.demo_ui_menus(), menus )}

	{#snippet overlays()}
		<div class="flex flex-wrap items-center gap-4">
			<Drawer.Root>
				<Drawer.Trigger class={buttonVariants( { variant: 'outline' } )}>{m.demo_ui_drawer_open()}</Drawer.Trigger>
				<Drawer.Content>
					<div class="mx-auto w-full max-w-sm">
						<Drawer.Header>
							<Drawer.Title>{m.demo_ui_drawer_title()}</Drawer.Title>
							<Drawer.Description>{m.demo_ui_drawer_desc()}</Drawer.Description>
						</Drawer.Header>
						<Drawer.Footer>
							<Drawer.Close class={buttonVariants( { variant: 'outline' } )}>{m.demo_ui_close()}</Drawer.Close>
						</Drawer.Footer>
					</div>
				</Drawer.Content>
			</Drawer.Root>

			<HoverCard.Root>
				<HoverCard.Trigger href="/hello" class="text-sm font-medium underline-offset-4 hover:underline">@ada</HoverCard.Trigger>
				<HoverCard.Content class="w-64 text-sm">
					<p class="font-medium">Ada Lovelace</p>
					<p class="text-muted-foreground">{m.demo_ui_hover_card()}</p>
				</HoverCard.Content>
			</HoverCard.Root>
		</div>
	{/snippet}
	{@render section( 'Drawer · HoverCard', m.demo_ui_overlays(), overlays )}
</div>
