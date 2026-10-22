import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'

// One schema per form, imported by the page ( browser validation ) AND the endpoint /
// action ( server validation ). Messages come from src/lib/validation.ts unless a rule
// needs its own wording.

export const PLANS = [ 'free', 'pro', 'team' ] as const

export const profileSchema = v.object( {
	name      : v.pipe( v.string(), v.trim(), v.nonEmpty(), v.maxLength( 60 ) ),
	email     : v.pipe( v.string(), v.trim(), v.nonEmpty(), v.email() ),
	// Optional: empty, or a real URL.
	website   : v.pipe( v.string(), v.trim(), v.check( ( value ) => value === '' || URL.canParse( value ), () => m.validation_url() ) ),
	seats     : v.pipe( v.number(), v.integer(), v.minValue( 1 ), v.maxValue( 500 ) ),
	plan      : v.picklist( PLANS ),
	bio       : v.pipe( v.string(), v.maxLength( 160 ) ),
	newsletter: v.boolean()
} )

export type Profile = v.InferOutput<typeof profileSchema>

export const newsletterSchema = v.object( {
	email: v.pipe( v.string(), v.trim(), v.nonEmpty(), v.email() )
} )
