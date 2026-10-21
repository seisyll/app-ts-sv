import { defineClient } from '../define.ts'
import { full } from '../presets/full.ts'

/* ―― » The build when CLIENT isn't set: every module, so development sees everything. A
        project with one deployment edits this file; one that builds per client adds
        config/clients/<name>.ts and sets CLIENT=<name> ( for dev and for the build ):

          export default defineClient( { extends: core, modules: { media: true, mail: true, editor: true } } ) */
export default defineClient( {
	extends: full
} )
