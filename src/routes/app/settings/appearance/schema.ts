import * as v from 'valibot'
import { appearanceSettingSchema } from '#lib/appearance.js'
import { brandSchema } from '#lib/brand.js'

// The page's one form: the workspace look and its brand, saved together under one SaveBar.
export const appearancePageSchema = v.object( { ...brandSchema.entries, ...appearanceSettingSchema.entries } )
