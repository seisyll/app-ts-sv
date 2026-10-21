import { getContext, setContext } from 'svelte'
import { http } from '$lib/http'
import type { NotificationItem, NotificationPage } from '$lib/notifications'
import { m } from '$lib/paraglide/messages'

/* ―― » The bell's and the inbox's shared state ( the fundraiser app's store ): one per /app
        layout, handed down by context — not a module singleton, so concurrent server renders
        can't share a reader's notifications. The bell owns the polling ( watch() ); marking
        read is optimistic and re-syncs from the server if the request fails. */
export class NotificationStore {
	items = $state<NotificationItem[]>( [] )
	unread = $state( 0 )
	error = $state<string | null>( null )

	readonly #endpoint : string

	constructor( initial ?: NotificationPage, endpoint = '/api/notifications' ) {
		this.#endpoint = endpoint
		this.hydrate( initial )
	}

	// What still needs handling: the unread ones.
	get queue() : NotificationItem[] {
		return this.items.filter( ( item ) => !item.readAt )
	}

	hydrate( page ?: NotificationPage ) : void {
		this.items = page?.items ?? []
		this.unread = page?.unread ?? 0
	}

	refresh = async( limit = 20 ) : Promise<void> => {
		try {
			this.hydrate( await http.get<NotificationPage>( `${ this.#endpoint }?limit=${ limit }` ) )
			this.error = null
		} catch {
			this.error = m.notif_failed()
		}
	}

	// These ids, or all. The badge drops by exactly what this flipped: the loaded page can
	// be shorter than the true unread count.
	markRead = async( ids ?: string[] ) : Promise<void> => {
		const all = !ids?.length
		const now = new Date().toISOString()
		let flipped = 0

		this.items = this.items.map( ( item ) => {
			if ( item.readAt || ( !all && !ids.includes( item.id ) ) )
				return item

			flipped++

			return { ...item, readAt: now }
		} )
		this.unread = all ? 0 : Math.max( 0, this.unread - flipped )

		try {
			await http.post( `${ this.#endpoint }/read`, all ? {} : { ids } )
		} catch {
			await this.refresh()
		}
	}

	// Poll, and catch up the moment the tab is looked at again. Returns the stop function.
	watch( every = 30_000 ) : () => void {
		const timer = setInterval( () => void this.refresh(), every )
		const onVisible = () => document.visibilityState === 'visible' && void this.refresh()

		document.addEventListener( 'visibilitychange', onVisible )

		return () => {
			clearInterval( timer )
			document.removeEventListener( 'visibilitychange', onVisible )
		}
	}
}

const KEY = Symbol( 'notifications' )

export const setNotifications = ( store : NotificationStore ) => setContext( KEY, store )
export const getNotifications = () => getContext<NotificationStore>( KEY )
