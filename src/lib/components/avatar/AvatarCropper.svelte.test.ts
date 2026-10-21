import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import AvatarCropper from './AvatarCropper.svelte'

// A wide picture: 600 × 300, left half one colour and right half another.
function picture() : string {
	const canvas = document.createElement( 'canvas' )
	const context = canvas.getContext( '2d' )!

	canvas.width = 600
	canvas.height = 300
	context.fillStyle = '#0a0'
	context.fillRect( 0, 0, 300, 300 )
	context.fillStyle = '#00a'
	context.fillRect( 300, 0, 300, 300 )

	return canvas.toDataURL( 'image/png' )
}

const pixel = async( blob : Blob, x : number, y : number ) => {
	const canvas = new OffscreenCanvas( 512, 512 )
	const context = canvas.getContext( '2d' )!

	context.drawImage( await createImageBitmap( blob ), 0, 0 )

	return [ ...context.getImageData( x, y, 1, 1 ).data.slice( 0, 3 ) ]
}

describe( 'AvatarCropper', () => {
	it( 'crops a centred square at the size asked for', async() => {
		const { component } = await render( AvatarCropper, { src: picture(), frame: 200 } )

		await expect.poll( () => document.querySelector<HTMLImageElement>( 'img' )?.style.width ).toBe( '400px' )

		const blob = await component.crop()
		const bitmap = await createImageBitmap( blob )

		expect( [ blob.type, bitmap.width, bitmap.height ] ).toEqual( [ 'image/webp', 512, 512 ] )
		// Centred on a 2:1 picture: the middle, half of each colour.
		expect( ( await pixel( blob, 10, 256 ) )[ 1 ] ).toBeGreaterThan( 100 )
		expect( ( await pixel( blob, 500, 256 ) )[ 2 ] ).toBeGreaterThan( 100 )
	} )

	it( 'moves with the keys, never past the picture\'s edge', async() => {
		const { component } = await render( AvatarCropper, { src: picture(), frame: 200 } )

		await expect.poll( () => document.querySelector<HTMLImageElement>( 'img' )?.style.width ).toBe( '400px' )
		await page.getByRole( 'application' ).click()
		await userEvent.keyboard( '{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}' )

		// Pushed all the way: the frame shows the picture's left half only, green.
		expect( document.querySelector<HTMLImageElement>( 'img' )?.style.left ).toBe( '0px' )
		expect( ( await pixel( await component.crop(), 500, 256 ) )[ 1 ] ).toBeGreaterThan( 100 )
	} )
} )
