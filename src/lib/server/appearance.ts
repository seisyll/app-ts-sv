import type { Cookies } from '@sveltejs/kit'
import { dev } from '$app/env'
import {
	appearanceClasses,
	DEFAULT_SETTING,
	isPalette,
	isRadius,
	isStyle,
	NO_OVERRIDE,
	parseAppearance,
	resolveAppearance,
	serializeAppearance,
	type Appearance,
	type AppearanceOverride,
	type AppearanceSetting,
	type AppearanceState
} from '#lib/appearance.js'
import { currentTenant, db } from '#lib/server/db/index.js'
import { moduleActive } from '#lib/server/modules.js'

/* ―― » The appearance cookie is an SSR CACHE, never the truth: <html> needs its classes in
        the server-rendered response ( applied in the browser, every load would flash the
        default ), and a database read per request for a display preference is too dear.
        So the last resolved look rides a cookie; hooks.server.ts validates it and paints
        <html>, and the /app layout, which reads the truth anyway, heals it when it drifts.

        A stale cookie costs one navigation of last week's colours — unlike a permission, it
        widens nothing. It also outlives sign-out on purpose: /login keeps the workspace's
        look, and the value identifies nobody. */
export const APPEARANCE_COOKIE = 'appearance'

export const appearanceClassOf = ( cookies : Cookies ) => appearanceClasses( parseAppearance( cookies.get( APPEARANCE_COOKIE ) ) )

export function rememberAppearance( cookies : Cookies, resolved : Appearance ) : void {
	const value = serializeAppearance( resolved )

	if ( cookies.get( APPEARANCE_COOKIE ) !== value )
		cookies.set( APPEARANCE_COOKIE, value, { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 } )
}

// The workspace default ( no row yet: the defaults ), one person's overrides, and the answer.
export async function loadAppearance( userId : string ) : Promise<AppearanceState> {
	// The module off: the defaults for everyone ( and the cookie heals to them ).
	if ( !MODULES.appearance || !await moduleActive( 'appearance' ) )
		return { setting: DEFAULT_SETTING, override: NO_OVERRIDE, resolved: resolveAppearance( DEFAULT_SETTING ) }

	const [ row, user ] = await Promise.all( [
		db.appearanceSetting.findFirst( { select: { palette: true, style: true, radius: true, allowUserOverride: true } } ),
		db.user.findUnique( { where: { id: userId }, select: { appearancePalette: true, appearanceStyle: true, appearanceRadius: true } } )
	] )
	// Stored ids the catalog no longer has fall back to defaults. Kept as STORED, not
	// resolved: the settings form shows the radius chosen, even where a style ignores it.
	const setting : AppearanceSetting = {
		palette          : isPalette( row?.palette ) ? row.palette : DEFAULT_SETTING.palette,
		style            : isStyle( row?.style ) ? row.style : DEFAULT_SETTING.style,
		radius           : isRadius( row?.radius ) ? row.radius : DEFAULT_SETTING.radius,
		allowUserOverride: row?.allowUserOverride ?? DEFAULT_SETTING.allowUserOverride
	}
	const override : AppearanceOverride = {
		palette: isPalette( user?.appearancePalette ) ? user.appearancePalette : null,
		style  : isStyle( user?.appearanceStyle ) ? user.appearanceStyle : null,
		radius : isRadius( user?.appearanceRadius ) ? user.appearanceRadius : null
	}

	return { setting, override, resolved: resolveAppearance( setting, override ) }
}

export async function saveWorkspaceAppearance( setting : AppearanceSetting ) : Promise<void> {
	const { id } = await currentTenant()

	await db.appearanceSetting.upsert( { where: { tenantId: id }, create: setting, update: setting } )
}

export async function saveUserAppearance( userId : string, override : AppearanceOverride ) : Promise<void> {
	await db.user.update( {
		where: { id: userId },
		data : { appearancePalette: override.palette, appearanceStyle: override.style, appearanceRadius: override.radius }
	} )
}
