import type * as Notifications from './index'

/* ―― » The notifications module as the rest of the app reaches it — import these, not ./index,
        from code outside the module. Loads the module only when this build ships it
        ( `MODULES.notifications` ); without it, notifying is a no-op and bundles nothing. */
export async function notify<T extends Notifications.NotificationType>( notification : Parameters<typeof Notifications.notify<T>>[ 0 ] ) : Promise<void> {
	if ( MODULES.notifications )
		await ( await import( './index' ) ).notify( notification )
}

// The bell's first page; null without the module.
export async function firstPage( userId : string ) : Promise<Awaited<ReturnType<typeof Notifications.listNotifications>> | null> {
	return MODULES.notifications ? ( await import( './index' ) ).listNotifications( userId ) : null
}
