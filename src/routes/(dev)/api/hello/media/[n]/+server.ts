import { dev } from '$app/environment'
import { error } from '@sveltejs/kit'
import { mockMedia } from '../../../../demo-data'
import type { RequestHandler } from './$types'

// A generated picture for mock media row n: its size, a gradient, its name.
export const GET : RequestHandler = ( { params } ) => {
	const n = Number( params.n )

	if ( !dev || !Number.isInteger( n ) )
		error( 404 )

	const { width = 1000, height = 1000, name } = mockMedia( n ) as { width : number, height : number, name : string }
	const hue = ( n * 47 ) % 360
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ width }" height="${ height }" viewBox="0 0 ${ width } ${ height }">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${ hue } 70% 60%)"/><stop offset="1" stop-color="hsl(${ hue + 70 } 65% 30%)"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/><circle cx="${ width * 0.72 }" cy="${ height * 0.3 }" r="${ Math.min( width, height ) * 0.16 }" fill="white" fill-opacity=".25"/>
<text x="6%" y="88%" font-family="sans-serif" font-size="${ Math.min( width, height ) / 9 }" fill="white">${ name.replace( /\.\w+$/, '' ) }</text></svg>`

	return new Response( svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=3600' } } )
}
