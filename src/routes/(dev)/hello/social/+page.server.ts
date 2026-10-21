import type { Actions } from './$types'

// Stand-ins for /login/social and the profile page's actions: each says what it was sent.
const echo = ( verb : string ) => async( { request } : { request : Request } ) => ( { said: `${ verb } ${ ( await request.formData() ).get( 'provider' ) }` } )

export const actions : Actions = {
	social: echo( 'sign in with' ),
	link  : echo( 'connect' ),
	unlink: echo( 'disconnect' )
}
