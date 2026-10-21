import type { ModuleId } from '$config/modules'

/* ―― » Replaced at build time by config/vite.ts ( Vite `define` ), never real globals:
          MODULES.<id>       → true / false. Guard code that should leave the bundle when a
                               module is off: `if ( MODULES.media ) …`, `{#if MODULES.media}`.
                               Only the literal `MODULES.<id>` form is replaced — for an id
                               held in a variable, use isBuilt( id ) from $lib/modules.
          __BUILT_MODULES__  → the whole map, and __CLIENT__ the client's name; read only by
                               $lib/modules. */
declare global {
	const MODULES : Readonly<Record<ModuleId, boolean>>
	const __BUILT_MODULES__ : Readonly<Record<ModuleId, boolean>>
	const __CLIENT__ : string
}

export {}
