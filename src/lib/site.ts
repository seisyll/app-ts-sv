import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'

/* ―― » What a workspace can say on its public site ( the fundraiser app's static pages and
        contact links, per workspace ): a few pages written with the rich-text editor, and
        the footer's tagline, contact details and social links. Shared by the settings
        pages, the server ( src/lib/server/site.ts ) and the themes. */

// Each is served at /<key>. Adding one: a key here, its title message, and it is editable.
export const SITE_PAGES = {
	privacy: m.site_page_privacy,
	terms  : m.site_page_terms,
	about  : m.site_page_about
} as const satisfies Record<string, () => string>

export type SitePageKey = keyof typeof SITE_PAGES

export const SITE_PAGE_KEYS = Object.keys( SITE_PAGES ) as SitePageKey[]

export const isSitePage = ( key : string ) : key is SitePageKey => Object.hasOwn( SITE_PAGES, key )

// The networks a footer can link to, in the order they show.
export const SOCIAL_NETWORKS = {
	x        : 'X',
	facebook : 'Facebook',
	instagram: 'Instagram',
	linkedin : 'LinkedIn',
	youtube  : 'YouTube',
	whatsapp : 'WhatsApp',
	github   : 'GitHub'
} as const

export type SocialNetwork = keyof typeof SOCIAL_NETWORKS

export const SOCIAL_NETWORK_IDS = Object.keys( SOCIAL_NETWORKS ) as SocialNetwork[]

export type SocialLink = { network : SocialNetwork, label : string, href : string }

// What the public site shows; null when there is no workspace or no database.
export type PublicSite = {
	tagline : string | null
	email   : string | null
	phone   : string | null
	social  : SocialLink[]
	// The pages this workspace has written, in SITE_PAGES order.
	pages   : SitePageKey[]
}

/* ―― » Blank means "not set" for every field, so a cleared box saves as nothing instead of
        failing a format it was never meant to have. */
const text = ( max : number ) => v.pipe( v.string(), v.trim(), v.maxLength( max ) )
const orBlank = ( valid : ( value : string ) => boolean, message : () => string ) => v.check( ( value : string ) => value === '' || valid( value ), message )
const https = ( value : string ) => URL.canParse( value ) && new URL( value ).protocol === 'https:'
const link = v.pipe( text( 500 ), orBlank( https, () => m.site_link_invalid() ) )

export const siteSettingsSchema = v.object( {
	tagline: text( 200 ),
	email  : v.pipe( text( 254 ), orBlank( ( value ) => v.EMAIL_REGEX.test( value ), () => m.validation_email() ) ),
	phone  : v.pipe( text( 40 ), orBlank( ( value ) => /^\+?[\d\s().-]{4,}$/.test( value ), () => m.site_phone_invalid() ) ),
	links  : v.object( { x: link, facebook: link, instagram: link, linkedin: link, youtube: link, whatsapp: link, github: link } satisfies Record<SocialNetwork, typeof link> )
} )

export type SiteSettingsInput = v.InferOutput<typeof siteSettingsSchema>
