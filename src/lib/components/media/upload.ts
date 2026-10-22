import { toast } from 'svelte-sonner'
import { errorMessage, http } from '#lib/http.js'
import { prepareImage, type MediaRow } from '#lib/media.js'
import { m } from '#lib/paraglide/messages.js'

// Upload files one by one ( each request under the body limit, each with its own answer ),
// shrinking images first. One progress toast; a failed file says why and the rest go on.
export async function uploadMedia( files : File[], endpoint = '/api/media' ) : Promise<MediaRow[]> {
	const done : MediaRow[] = []
	const progress = toast.loading( m.media_uploading( { current: 1, total: files.length } ) )

	for ( const [ index, file ] of files.entries() ) {
		toast.loading( m.media_uploading( { current: index + 1, total: files.length } ), { id: progress } )

		const body = new FormData()

		body.set( 'file', await prepareImage( file ) )

		try {
			done.push( await http.post<MediaRow>( endpoint, body ) )
		} catch ( caught ) {
			toast.error( errorMessage( caught ) )
		}
	}

	if ( done.length )
		toast.success( m.media_uploaded( { count: done.length } ), { id: progress } )
	else
		toast.dismiss( progress )

	return done
}
