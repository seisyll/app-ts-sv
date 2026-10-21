/* ―― » Dev only: every email the app renders lands here too, newest first, and /hello/mail
        shows them. Without a mail server it is the only place they go, so password resets
        and invites work on a fresh checkout. In memory, on globalThis so it survives hot
        reloads; a restart empties it. */

export type OutboxMail = {
	id        : string
	at        : string
	workspace : string
	to        : string
	subject   : string
	html      : string
	text      : string
	// Also handed to the workspace's mail server ( false: the outbox was the only copy ).
	sent      : boolean
}

const KEEP = 50

const store = ( ( globalThis as { __mailOutbox ?: OutboxMail[] } ).__mailOutbox ??= [] )

export function record( mail : Omit<OutboxMail, 'id' | 'at'> ) : void {
	store.unshift( { id: crypto.randomUUID(), at: new Date().toISOString(), ...mail } )
	store.length = Math.min( store.length, KEEP )
}

export const listOutbox = () : OutboxMail[] => [ ...store ]

export function clearOutbox() : void {
	store.length = 0
}
