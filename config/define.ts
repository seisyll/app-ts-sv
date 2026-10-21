import type { ModuleId } from './modules.ts'

/* ―― » What a client config ( config/clients/<name>.ts ) says, and the presets it builds on.
        Presets apply in order, then the client's own values: later wins, module by module. */

export type Preset = {
	// On or off per module; one no preset mentions is off.
	modules ? : Partial<Record<ModuleId, boolean>>
	// The public site's theme: a folder in src/lib/themes.
	theme ?   : string
}

export type ClientConfig = Preset & {
	extends ? : Preset | Preset[]
}

// Identity helpers, for types and autocomplete while writing a config.
export const definePreset = ( preset : Preset ) : Preset => preset
export const defineClient = ( config : ClientConfig ) : ClientConfig => config
