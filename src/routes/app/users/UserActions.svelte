<script lang="ts">
	import BanIcon from '@lucide/svelte/icons/ban'
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis'
	import ImageOffIcon from '@lucide/svelte/icons/image-off'
	import LogOutIcon from '@lucide/svelte/icons/log-out'
	import ShieldIcon from '@lucide/svelte/icons/shield'
	import TrashIcon from '@lucide/svelte/icons/trash-2'
	import UndoIcon from '@lucide/svelte/icons/undo-2'
	import * as AlertDialog from '$lib/components/ui/alert-dialog'
	import { Button } from '$lib/components/ui/button'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import { mutate } from '$lib/mutate'
	import { m } from '$lib/paraglide/messages'
	import type { RoleName } from '$lib/permissions'
	import { ROLE_NAMES, roleLabel, type UserChange, type UserRow } from '$lib/users'

	// `self`: your own row — no actions ( the endpoint refuses them too ).
	let { user, self, onchange } : { user : UserRow, self : boolean, onchange : () => void } = $props()

	const name = $derived( user.name )
	const path = $derived( `/api/users/${ user.id }` )

	// The list is a TableSource, not load data: refresh it instead of invalidating.
	const change = ( body : UserChange, success : string ) => mutate( path, { method: 'PATCH', body, success, refresh: false, onSuccess: onchange } )
	const remove = () => mutate( path, { method: 'DELETE', success: m.users_deleted( { name } ), refresh: false, onSuccess: onchange } )

	const setRole = ( role : string ) => {
		if ( role !== user.role )
			void change( { action: 'set-role', role: role as RoleName }, m.users_role_changed( { name, role: roleLabel( role ) } ) )
	}

	// Ban and delete ask first, in one dialog. `confirming` outlives `open` so the text
	// doesn't switch while the dialog animates out.
	let open = $state( false )
	let confirming = $state<'ban' | 'delete'>( 'delete' )
	const ask = ( what : 'ban' | 'delete' ) => {
		confirming = what
		open = true
	}
	const confirm = $derived( confirming === 'ban'
		? { title: m.users_ban_title( { name } ), description: m.users_ban_desc(), action: m.users_ban(), run: () => change( { action: 'ban' }, m.users_banned( { name } ) ) }
		: { title: m.users_delete_title( { name } ), description: m.users_delete_desc(), action: m.users_delete(), run: remove } )
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger disabled={self}>
		{#snippet child( { props } )}
			<Button {...props} variant="ghost" size="icon-sm" aria-label={m.users_actions( { name } )}>
				<EllipsisIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-52">
		<DropdownMenu.Group>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<ShieldIcon />
					{m.users_role()}
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.RadioGroup value={user.role} onValueChange={setRole}>
						{#each ROLE_NAMES as role ( role )}
							<DropdownMenu.RadioItem value={role}>{roleLabel( role )}</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Item onclick={() => change( { action: 'revoke-sessions' }, m.users_revoked( { name } ) )}>
				<LogOutIcon />
				{m.users_revoke()}
			</DropdownMenu.Item>
			{#if MODULES.media && user.avatar}
				<DropdownMenu.Item onclick={() => change( { action: 'remove-avatar' }, m.users_avatar_removed( { name } ) )}>
					<ImageOffIcon />
					{m.users_remove_avatar()}
				</DropdownMenu.Item>
			{/if}
			{#if user.banned}
				<DropdownMenu.Item onclick={() => change( { action: 'unban' }, m.users_unbanned( { name } ) )}>
					<UndoIcon />
					{m.users_unban()}
				</DropdownMenu.Item>
			{:else}
				<DropdownMenu.Item onclick={() => ask( 'ban' )}>
					<BanIcon />
					{m.users_ban()}
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<DropdownMenu.Group>
			<DropdownMenu.Item variant="destructive" onclick={() => ask( 'delete' )}>
				<TrashIcon />
				{m.users_delete()}
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{confirm.title}</AlertDialog.Title>
			<AlertDialog.Description>{confirm.description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.table_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={() => { void confirm.run(); open = false }}>{confirm.action}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
