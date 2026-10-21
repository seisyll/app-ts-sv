/* ―― » Media, shared by the browser and the server ( src/lib/server/media.ts ).

        Two kinds. An IMAGE is re-encoded by the server ( sharp: turned upright, metadata
        stripped, WebP, plus a thumbnail ); a DOCUMENT ( PDF ) is stored byte for byte and
        only ever downloaded. The browser may shrink an image first to save the upload, but
        that is a convenience: the server decides what is accepted and what is stored. */

export type MediaKind = 'image' | 'document'

// What the file pickers offer. The server sniffs the bytes and ignores what a browser
// claims, so these are hints that keep people from picking a file that will be refused.
export const ACCEPT : Record<MediaKind, string> = {
	image   : 'image/png,image/jpeg,image/webp,image/gif,image/avif',
	document: 'application/pdf'
}

// Caps on one upload, checked by the server. adapter-node's BODY_SIZE_LIMIT ( see
// .env.example ) must stay above the larger one, or it refuses first with a bare 413.
export const MAX_BYTES : Record<MediaKind, number> = {
	image   : 10 * 1024 * 1024,
	document: 10 * 1024 * 1024
}

// The longest side an image is stored at, and its thumbnail's.
export const IMAGE_EDGE = 2560
export const THUMB_EDGE = 480

// One file as the app sees it. The URLs are built by the server, so a component never
// needs to know where files live ( the playground serves its own ).
export type MediaRow = {
	id        : string
	kind      : MediaKind
	name      : string
	mime      : string
	size      : number
	width     : number | null
	height    : number | null
	createdAt : string
	uploader  : string | null
	// Served without a session ( see /media ): a logo, an image in an email.
	public    : boolean
	url       : string
	thumbUrl  : string
}

export const mediaUrl = ( id : string, variant ?: 'thumb' ) => `/media/${ id }${ variant ? `/${ variant }` : '' }`

// "1.4 MB" ( $lib/bytes, where scripts can reach it ).
export { formatBytes } from './bytes'

/* ―― » In the browser, before an upload: shrink what is too big to send, and re-encode
        JPEGs so a phone photo's EXIF ( GPS, camera serial ) never leaves the device. The
        canvas writes no metadata, and createImageBitmap turns the photo upright first.
        Left alone: small PNG / WebP / AVIF ( already lean; the server strips them anyway ),
        GIFs ( a canvas would drop the animation ) and anything that isn't an image.
        ponytail: one quality step; a file still over MAX_BYTES is the server's to refuse. */
export async function prepareImage( file : File ) : Promise<File> {
	const isJpeg = file.type === 'image/jpeg'

	if ( !isJpeg && ( file.type === 'image/gif' || !file.type.startsWith( 'image/' ) || file.size <= 2 * 1024 * 1024 ) )
		return file

	let bitmap : ImageBitmap

	try {
		bitmap = await createImageBitmap( file )
	} catch {
		return file
	}

	const scale = Math.min( 1, IMAGE_EDGE / Math.max( bitmap.width, bitmap.height ) )
	const canvas = document.createElement( 'canvas' )

	canvas.width = Math.round( bitmap.width * scale )
	canvas.height = Math.round( bitmap.height * scale )
	canvas.getContext( '2d' )?.drawImage( bitmap, 0, 0, canvas.width, canvas.height )
	bitmap.close()

	// JPEG stays JPEG; anything else keeps its transparency as WebP ( or PNG where a
	// browser can't write WebP — toBlob falls back on its own ).
	const type = isJpeg ? 'image/jpeg' : 'image/webp'
	const blob = await new Promise<Blob | null>( ( resolve ) => canvas.toBlob( resolve, type, 0.92 ) )

	return blob ? new File( [ blob ], file.name, { type: blob.type } ) : file
}
