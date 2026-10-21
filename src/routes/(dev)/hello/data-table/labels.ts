import { m } from '$lib/paraglide/messages'
import type { Customer } from '../../demo-data'

export const planLabel = ( plan : Customer['plan'] ) => ( { free: 'Free', pro: 'Pro', team: 'Team' } )[ plan ]

export const statusLabel = ( status : Customer['status'] ) => ( {
	active : m.demo_table_status_active(),
	trial  : m.demo_table_status_trial(),
	churned: m.demo_table_status_churned()
} )[ status ]
