import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import { IMAGE_EDGE, prepareImage, type MediaRow } from '$lib/media'
import MediaField from './MediaField.svelte'
import MediaGrid from './MediaGrid.svelte'
import MediaLightbox from './MediaLightbox.svelte'

// A tiny inline picture, so <img> loads without a server.
const PIXEL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2230%22/%3E'

const row = ( n : number, kind : MediaRow[ 'kind' ] = 'image' ) : MediaRow => ( {
	id       : `00000000-0000-7000-8000-00000000000${ n }`,
	kind,
	name     : kind === 'image' ? `Photo ${ n }.jpg` : `Contract ${ n }.pdf`,
	mime     : kind === 'image' ? 'image/webp' : 'application/pdf',
	size     : 2048 * n,
	width    : kind === 'image' ? 40 : null,
	height   : kind === 'image' ? 30 : null,
	createdAt: '2026-10-21T08:00:00.000Z',
	uploader : 'Ada Lovelace',
	public   : false,
	url      : PIXEL,
	thumbUrl : PIXEL
} )

async function canvasFile( width : number, height : number, type : string, name : string ) {
	const canvas = document.createElement( 'canvas' )

	canvas.width = width
	canvas.height = height
	canvas.getContext( '2d' )!.fillRect( 0, 0, width, height )

	const blob = await new Promise<Blob>( ( resolve ) => canvas.toBlob( ( value ) => resolve( value! ), type ) )

	return new File( [ blob ], name, { type } )
}

describe( 'prepareImage', () => {
	it( 'shrinks a big photo to the stored edge and keeps it a JPEG', async() => {
		const prepared = await prepareImage( await canvasFile( 4000, 2000, 'image/jpeg', 'big.jpg' ) )
		const bitmap = await createImageBitmap( prepared )

		expect( [ prepared.type, prepared.name, bitmap.width, bitmap.height ] ).toEqual( [ 'image/jpeg', 'big.jpg', IMAGE_EDGE, IMAGE_EDGE / 2 ] )
	} )

	it( 'leaves small PNGs, GIFs and documents untouched', async() => {
		const png = await canvasFile( 300, 200, 'image/png', 'logo.png' )
		const gif = new File( [ 'GIF89a' ], 'anim.gif', { type: 'image/gif' } )
		const pdf = new File( [ '%PDF-1.4' ], 'a.pdf', { type: 'application/pdf' } )

		expect( await prepareImage( png ) ).toBe( png )
		expect( await prepareImage( gif ) ).toBe( gif )
		expect( await prepareImage( pdf ) ).toBe( pdf )
	} )
} )

describe( 'MediaGrid', () => {
	it( 'shows images as tiles and documents as rows, and reports the click', async() => {
		const onselect = vi.fn()
		const screen = await render( MediaGrid, { items: [ row( 1 ), row( 2 ) ], view: 'grid', onselect } )

		await page.getByRole( 'button', { name: 'Photo 2.jpg' } ).click()
		expect( onselect ).toHaveBeenCalledWith( expect.objectContaining( { name: 'Photo 2.jpg' } ), 1 )

		await screen.rerender( { items: [ row( 3, 'document' ) ] } )
		await expect.element( page.getByText( 'Contract 3.pdf' ) ).toBeInTheDocument()
		await expect.element( page.getByText( /6\.0 KB/ ) ).toBeInTheDocument()
	} )

	it( 'marks the selected item when picking', async() => {
		await render( MediaGrid, { items: [ row( 1 ), row( 2 ) ], view: 'grid', selected: row( 2 ).id, onselect: () => {} } )

		await expect.element( page.getByRole( 'button', { name: 'Photo 2.jpg' } ) ).toHaveAttribute( 'aria-pressed', 'true' )
		await expect.element( page.getByRole( 'button', { name: 'Photo 1.jpg' } ) ).toHaveAttribute( 'aria-pressed', 'false' )
	} )
} )

describe( 'MediaLightbox', () => {
	it( 'opens on an item, moves with the arrow keys, and shows its details', async() => {
		await render( MediaLightbox, { items: [ row( 1 ), row( 2 ) ], open: true } )

		await expect.element( page.getByRole( 'dialog' ) ).toHaveAccessibleName( 'Photo 1.jpg' )
		await userEvent.keyboard( '{ArrowRight}' )
		await expect.element( page.getByRole( 'dialog' ) ).toHaveAccessibleName( 'Photo 2.jpg' )
		await expect.element( page.getByText( '2 / 2' ) ).toBeInTheDocument()
		await expect.element( page.getByText( 'Ada Lovelace' ) ).toBeInTheDocument()
		// No ondelete: no delete button.
		await expect.element( page.getByRole( 'button', { name: 'Delete' } ) ).not.toBeInTheDocument()
	} )

	it( 'deletes after a confirm', async() => {
		const ondelete = vi.fn( async() => true )

		await render( MediaLightbox, { items: [ row( 1 ) ], open: true, ondelete } )
		await page.getByRole( 'button', { name: 'Delete' } ).click()
		await page.getByRole( 'alertdialog' ).getByRole( 'button', { name: 'Delete' } ).click()

		expect( ondelete ).toHaveBeenCalledWith( expect.objectContaining( { name: 'Photo 1.jpg' } ) )
	} )

	it( 'says whether a file is public, and switches it when allowed', async() => {
		const onpublic = vi.fn( async() => {} )

		await render( MediaLightbox, { items: [ row( 1 ) ], open: true, onpublic } )
		await expect.element( page.getByText( 'Private — members only' ) ).toBeInTheDocument()
		await expect.element( page.getByRole( 'button', { name: 'Copy link' } ) ).not.toBeInTheDocument()

		await page.getByRole( 'button', { name: 'Make public' } ).click()
		expect( onpublic ).toHaveBeenCalledWith( expect.objectContaining( { name: 'Photo 1.jpg' } ), true )
	} )

	it( 'offers the link of a public file, even without the switch', async() => {
		await render( MediaLightbox, { items: [ { ...row( 1 ), public: true } ], open: true } )

		await expect.element( page.getByText( 'Public — anyone with the link' ) ).toBeInTheDocument()
		await expect.element( page.getByRole( 'button', { name: 'Copy link' } ) ).toBeInTheDocument()
		await expect.element( page.getByRole( 'button', { name: 'Make private' } ) ).not.toBeInTheDocument()
	} )

	it( 'offers a download instead of zoom for a document', async() => {
		await render( MediaLightbox, { items: [ row( 1, 'document' ) ], open: true } )

		await expect.element( page.getByRole( 'button', { name: 'Zoom in' } ) ).not.toBeInTheDocument()
		await expect.element( page.getByRole( 'link', { name: /Download · 2\.0 KB/ } ) ).toHaveAttribute( 'download', 'Contract 1.pdf' )
	} )
} )

describe( 'MediaField', () => {
	it( 'posts the media id with its form, and unlinks it on remove', async() => {
		const { container } = await render( MediaField, { label: 'Cover', name: 'cover', value: row( 1 ).id } )
		const hidden = () => container.querySelector<HTMLInputElement>( 'input[name=cover]' )!.value

		expect( hidden() ).toBe( row( 1 ).id )
		await expect.element( page.getByText( 'Replace' ) ).toBeInTheDocument()

		await page.getByRole( 'button', { name: 'Remove' } ).click()

		expect( hidden() ).toBe( '' )
		await expect.element( page.getByText( 'No image' ) ).toBeInTheDocument()
	} )
} )
