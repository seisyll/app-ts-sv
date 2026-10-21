import { log } from '$lib/server/log'

/* ―― » Where browsers report what the content security policy blocked ( svelte.config.js,
        `report-uri` ). Logged, one line each, so a policy too tight for a new feature shows
        up in the server log instead of as a silently broken page. Anyone can post here: a
        report is capped, never stored, and answered with nothing. */
export const POST = async( { request } ) => {
	const text = ( await request.text() ).slice( 0, 4_000 )
	const report = ( () => {
		try {
			return ( JSON.parse( text ) as { 'csp-report' ?: Record<string, unknown> } )[ 'csp-report' ]
		} catch {
			return undefined
		}
	} )()

	// The sender's words, capped: as JSON fields they can't forge log lines.
	const field = ( key : string ) => String( report?.[ key ] ?? '?' ).slice( 0, 300 )

	if ( report )
		log.warn( { scope: 'csp', directive: field( 'violated-directive' ), blocked: field( 'blocked-uri' ), page: field( 'document-uri' ) }, 'content security policy blocked something' )

	return new Response( null, { status: 204 } )
}
