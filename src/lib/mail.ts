import * as v from 'valibot'
import { isEmptyRichText, richTextSchema } from '#lib/editor/document.js'
import { m } from '#lib/paraglide/messages.js'

// Mail settings and email wording: the forms' schemas, shared by the settings pages
// ( browser ) and their actions ( server ). Sending lives in #lib/server/mail.

export const MAIL_SECURITY = [ 'tls', 'starttls', 'none' ] as const

export type MailSecurity = ( typeof MAIL_SECURITY )[ number ]

export const securityLabel = ( security : string ) : string =>
	( { tls: m.mail_security_tls(), starttls: m.mail_security_starttls(), none: m.mail_security_none() } as Record<string, string> )[ security ] ?? security

// The usual port for each, offered when the security changes.
export const SECURITY_PORT : Record<MailSecurity, number> = { tls: 465, starttls: 587, none: 25 }

const text = ( max : number ) => v.pipe( v.string(), v.trim(), v.maxLength( max ) )

export const mailSettingsSchema = v.object( {
	host     : v.pipe( text( 253 ), v.nonEmpty() ),
	port     : v.pipe( v.number(), v.integer(), v.minValue( 1 ), v.maxValue( 65535 ) ),
	security : v.picklist( MAIL_SECURITY ),
	username : text( 254 ),
	// Write-only: empty keeps the stored one.
	password : v.pipe( v.string(), v.maxLength( 1024 ) ),
	fromName : v.pipe( text( 100 ), v.nonEmpty() ),
	fromEmail: v.pipe( v.string(), v.trim(), v.nonEmpty(), v.email(), v.maxLength( 254 ) )
} )

export type MailSettingsInput = v.InferOutput<typeof mailSettingsSchema>

export const mailTemplateSchema = v.object( {
	subject: v.pipe( text( 200 ), v.nonEmpty() ),
	body   : v.pipe( richTextSchema, v.check( ( doc ) => !isEmptyRichText( doc ), () => m.mail_body_required() ) )
} )

export type MailTemplateInput = v.InferOutput<typeof mailTemplateSchema>
