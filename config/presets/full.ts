import { definePreset } from '../define.ts'
import { MODULE_IDS } from '../modules.ts'

// Every module, the default theme. What development runs with.
export const full = definePreset( {
	modules: Object.fromEntries( MODULE_IDS.map( ( id ) => [ id, true ] ) ),
	theme  : 'aurora'
} )
