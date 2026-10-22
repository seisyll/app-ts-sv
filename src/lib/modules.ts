import { MODULE_IDS, type ModuleId } from '#config/modules.js'
import { m } from '#lib/paraglide/messages.js'

export { MODULE_IDS, type ModuleId } from '#config/modules.js'

/* ―― » Which modules are on, browser and server ( registry: config/modules.ts ). Two levels:
          built   — this build ships it ( the client config ). Off: its routes are stubbed and
                    `MODULES.<id>` guards drop its code.
          active  — built AND switched on for the current workspace ( shared tenancy can switch
                    modules off per tenant ). Pages get the list as `data.modules` from the
                    /app layout; the server asks #lib/server/modules. */

export const BUILT : Readonly<Record<ModuleId, boolean>> = __BUILT_MODULES__

// The client config this build came from ( config/clients/<name>.ts ).
export const CLIENT : string = __CLIENT__

export const isBuilt = ( id : ModuleId ) : boolean => BUILT[ id ] === true

export const BUILT_MODULES = MODULE_IDS.filter( isBuilt )

export const moduleLabel = ( id : ModuleId ) : string => ( {
	site         : m.module_site(),
	users        : m.module_users(),
	appearance   : m.module_appearance(),
	media        : m.module_media(),
	editor       : m.module_editor(),
	notifications: m.module_notifications(),
	captcha      : m.module_captcha(),
	social       : m.module_social(),
	help         : m.module_help(),
	audit        : m.module_audit(),
	signins      : m.module_signins(),
	mail         : m.module_mail()
} )[ id ]
