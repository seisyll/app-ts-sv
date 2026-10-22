import { error } from '@sveltejs/kit'
import { appearanceOverrideSchema, resolveAppearance } from '#lib/appearance.js'
import { m } from '#lib/paraglide/messages.js'
import { loadAppearance, rememberAppearance, saveUserAppearance } from '#lib/server/appearance.js'
import { readJson } from '#lib/server/forms.js'
import { requireApiUser } from '#lib/server/guards.js'
import type { RequestHandler } from './$types'

// PUT — the caller's own appearance ( the header picker ): { palette, style, radius }, each
// an id or null to follow the workspace. Any signed-in user, while the workspace allows it.
// The cookie is refreshed here, so even a hard reload right after paints the new look.
export const PUT : RequestHandler = async( event ) => {
	const { user } = await requireApiUser( event )
	const override = await readJson( event.request, appearanceOverrideSchema )
	const { setting } = await loadAppearance( user.id )

	if ( !setting.allowUserOverride )
		error( 403, m.appearance_not_allowed() )

	await saveUserAppearance( user.id, override )

	const resolved = resolveAppearance( setting, override )

	rememberAppearance( event.cookies, resolved )

	return Response.json( { resolved } )
}
