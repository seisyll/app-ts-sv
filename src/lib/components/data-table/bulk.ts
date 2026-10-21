import type { Component } from 'svelte'
import { toast } from 'svelte-sonner'

export type BulkConfirm = {
	title ?       : string
	description ? : ( count : number ) => string
	actionLabel ? : string
}

type Run<T> = ( rows : T[] ) => Promise<unknown> | unknown

export type BulkMenuItem<T> = {
	value     : string
	label     : string
	icon ?    : Component
	variant ? : 'default' | 'destructive'
	confirm ? : BulkConfirm
	run       : Run<T>
}

// A button ( `run` ) or a dropdown of sub-actions ( `items` ). `keepSelection` skips the
// post-run reset — for actions that don't change rows, like an export.
export type BulkAction<T> = {
	id               : string
	label            : string
	icon ?           : Component
	variant ?        : 'default' | 'destructive'
	confirm ?        : BulkConfirm
	keepSelection ?  : boolean
	run ?            : Run<T>
	items ?          : BulkMenuItem<T>[]
}

export type RunBulkCopy = {
	loading   : string
	success   : ( ok : number ) => string
	// Some rows succeeded, some failed.
	partial ? : ( ok : number, fail : number ) => string
	error     : string
}

// Run a per-row mutation over the selection, settle ALL rows, report one toast. Never
// rejects — failures are in the toast. A synchronous throw counts as that row's failure.
export async function runBulk<T>( rows : T[], perItem : ( item : T ) => Promise<unknown> | unknown, copy : RunBulkCopy ) : Promise<void> {
	if ( rows.length === 0 )
		return

	const task = ( async() => {
		const results = await Promise.allSettled( rows.map( ( item ) => Promise.resolve().then( () => perItem( item ) ) ) )
		const ok = results.filter( ( result ) => result.status === 'fulfilled' ).length

		if ( ok === 0 )
			throw new Error( copy.error )

		return { ok, fail: results.length - ok }
	} )()

	toast.promise( task, {
		loading: copy.loading,
		success: ( { ok, fail } ) => ( fail > 0 && copy.partial ? copy.partial( ok, fail ) : copy.success( ok ) ),
		error  : copy.error
	} )

	await task.catch( () => undefined )
}
