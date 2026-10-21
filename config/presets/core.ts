import { definePreset } from '../define.ts'

// No optional modules: sign-in, the dashboard shell, settings. A base to add modules to.
export const core = definePreset( { modules: {} } )
