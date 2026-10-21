<script lang="ts">
	import TrashIcon from '@lucide/svelte/icons/trash-2'
	import { DataTable, runBulk, TableSource, type BulkAction } from '$lib/components/data-table'
	import { http } from '$lib/http'
	import { m } from '$lib/paraglide/messages'
	import type { UserRow } from '$lib/users'
	import AddUserDialog from './AddUserDialog.svelte'
	import { userColumns, userFilters, userSearch } from './columns'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const source = new TableSource<UserRow>( { path: '/api/users', initial: data.users } )
	const refresh = () => void source.refresh()

	// svelte-ignore state_referenced_locally
	const columns = userColumns( { me: data.me, onchange: refresh } )
	const filters = userFilters()
	const search = userSearch()

	const bulkActions : BulkAction<UserRow>[] = [ {
		id     : 'delete',
		label  : m.users_delete(),
		icon   : TrashIcon,
		variant: 'destructive',
		confirm: { title: m.users_delete_many_title(), actionLabel: m.users_delete() },
		run    : async( rows ) => {
			// Your own row is skipped; the endpoint would refuse it anyway.
			await runBulk( rows.filter( ( row ) => row.id !== data.me ), ( row ) => http.delete( `/api/users/${ row.id }` ), {
				loading: m.users_working(),
				success: ( count ) => m.users_deleted_many( { count } ),
				error  : m.users_bulk_failed()
			} )
			refresh()
		}
	} ]
</script>

<svelte:head>
	<title>{m.app_nav_users()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold tracking-tight">{m.app_nav_users()}</h1>
		<p class="text-muted-foreground text-sm">{m.users_desc()}</p>
	</div>

	<DataTable
		{source}
		{columns}
		{search}
		{filters}
		dateRange={{ columnId: 'createdAt' }}
		enableSelection
		{bulkActions}
		syncUrl
	>
		{#snippet toolbarActions()}
			<AddUserDialog canInvite={data.canInvite} onadded={refresh} />
		{/snippet}
	</DataTable>
</div>
