import { dev } from '$app/env'
import { error, json } from '@sveltejs/kit'
import { mockMedia } from '../../../demo-data'
import type { RequestHandler } from './$types'

// Mock media library for the playground: generated pictures ( see ./[n] ), nothing stored.
// GET pages like /api/media; POST answers a made-up row for whatever was uploaded.
const ALL = Array.from( { length: 40 }, ( _, n ) => mockMedia( n ) )

export const GET : RequestHandler = ( { url } ) => {
	if ( !dev )
		error( 404 )

	const search = ( url.searchParams.get( 'search' ) ?? '' ).toLowerCase()
	const skip = Number( url.searchParams.get( 'skip' ) ?? 0 )
	const take = Number( url.searchParams.get( 'take' ) ?? 24 )
	const rows = ALL.filter( ( row ) => row.name.toLowerCase().includes( search ) )

	return json( { rows: rows.slice( skip, skip + take ), total: rows.length } )
}

export const POST : RequestHandler = async( { request } ) => {
	if ( !dev )
		error( 404 )

	const file = ( await request.formData() ).get( 'file' )

	await new Promise( ( resolve ) => setTimeout( resolve, 500 ) )

	return json( mockMedia( Math.floor( Math.random() * 1000 ) + 100, file instanceof File ? file.name : 'upload.jpg' ), { status: 201 } )
}
