import { dev } from '$app/env'
import { error, json } from '@sveltejs/kit'
import { m } from '#lib/paraglide/messages.js'
import { getLocale } from '#lib/paraglide/runtime.js'
import type { RequestHandler } from './$types'

// Fixed mock data: no database. Only `message`/`locale` ( request locale ) and
// `servedAt` vary, so the playground can show server i18n and a live refetch.
const PLANS = [
	{ id: 'starter', name: 'Starter', price: 0 },
	{ id: 'pro', name: 'Pro', price: 29 },
	{ id: 'team', name: 'Team', price: 99 }
]

export type HelloResponse = {
	ok   : true
	data : {
		message  : string
		locale   : string
		servedAt : string
		plans    : typeof PLANS
	}
}

export const GET : RequestHandler = () => {
	if ( !dev )
		error( 404 )

	return json( {
		ok  : true,
		data: {
			message : m.api_greeting(),
			locale  : getLocale(),
			servedAt: new Date().toISOString(),
			plans   : PLANS
		}
	} satisfies HelloResponse )
}
