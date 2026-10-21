import type { Component } from 'svelte'
import BellIcon from '@lucide/svelte/icons/bell'
import ShieldIcon from '@lucide/svelte/icons/shield'
import UserPlusIcon from '@lucide/svelte/icons/user-plus'

// The glyph beside each catalog type ( presentation only; the catalog is server-side ).
const ICONS : Record<string, Component> = {
	'user.joined' : UserPlusIcon,
	'role.changed': ShieldIcon
}

export const notificationIcon = ( type : string ) : Component => ICONS[ type ] ?? BellIcon
