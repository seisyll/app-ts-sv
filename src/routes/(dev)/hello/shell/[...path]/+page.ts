import type { PageLoad } from './$types'

export const load : PageLoad = async( { params } ) => {
	const slow = params.path?.startsWith( 'reports' ) ?? false

	// Reports wait on purpose so the progress bar and the row spinner are visible.
	if ( slow )
		await new Promise( ( resolve ) => setTimeout( resolve, 900 ) )

	return { slow }
}
