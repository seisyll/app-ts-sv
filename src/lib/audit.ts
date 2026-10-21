import { m } from '$lib/paraglide/messages'

/* ―― » The audit trail's vocabulary, shared by the server ( src/lib/server/audit.ts ) and the
        page. A row stores its action and facts; it is worded here, in the reader's language,
        so rewording needs no migration. Adding an action: an entry below and its message. */

type Words = ( params : { actor : string, target : string } ) => string

export const AUDIT_ACTIONS = {
	'user.create'           : m.audit_user_create,
	'user.invite'           : m.audit_user_invite,
	'user.signup'           : m.audit_user_signup,
	'user.role'             : m.audit_user_role,
	'user.ban'              : m.audit_user_ban,
	'user.unban'            : m.audit_user_unban,
	'user.sessions'         : m.audit_user_sessions,
	'user.delete'           : m.audit_user_delete,
	'media.upload'          : m.audit_media_upload,
	'media.delete'          : m.audit_media_delete,
	'media.publish'         : m.audit_media_publish,
	'media.unpublish'       : m.audit_media_unpublish,
	'appearance.update'     : m.audit_appearance_update,
	'mail.settings'         : m.audit_mail_settings,
	'mail.template'         : m.audit_mail_template,
	'mail.template-reset'   : m.audit_mail_template_reset,
	'captcha.settings'      : m.audit_captcha_settings,
	'site.settings'         : m.audit_site_settings,
	'site.page'             : m.audit_site_page,
	'site.page-remove'      : m.audit_site_page_remove,
	'account.profile'       : m.audit_account_profile,
	'account.password'      : m.audit_account_password,
	'account.password-reset': m.audit_account_password_reset,
	'account.link'          : m.audit_account_link,
	'account.unlink'        : m.audit_account_unlink
} as const satisfies Record<string, Words>

export type AuditAction = keyof typeof AUDIT_ACTIONS

// Changed fields: [ before, after ], or null for a secret that changed ( never stored ).
export type AuditChanges = Record<string, [ unknown, unknown ] | null>

export type AuditRow = {
	id        : string
	at        : string
	actorId   : string | null
	actorName : string
	action    : string
	target    : string | null
	changes   : AuditChanges | null
	ip        : string | null
}

// The resource half of an action, for the table's filter: user, media, mail …
export const auditResource = ( action : string ) => action.split( '.' )[ 0 ]

export const AUDIT_RESOURCES = [ ...new Set( Object.keys( AUDIT_ACTIONS ).map( auditResource ) ) ]

export const auditResourceLabel = ( resource : string ) : string => ( {
	user      : m.audit_resource_user(),
	media     : m.audit_resource_media(),
	appearance: m.audit_resource_appearance(),
	mail      : m.audit_resource_mail(),
	captcha   : m.audit_resource_captcha(),
	site      : m.audit_resource_site(),
	account   : m.audit_resource_account()
} as Record<string, string> )[ resource ] ?? resource

// "Ada changed the role of Bob". An action this build no longer knows is still shown, plainly.
export function auditSentence( row : Pick<AuditRow, 'action' | 'actorName' | 'target'> ) : string {
	const words = ( AUDIT_ACTIONS as Record<string, Words> )[ row.action ]

	return words ? words( { actor: row.actorName, target: row.target ?? '' } ) : `${ row.actorName }: ${ row.action } ${ row.target ?? '' }`.trim()
}

// A field's name in the reader's language; one without a label keeps its key.
export const auditFieldLabel = ( field : string ) : string => ( {
	role             : m.users_role(),
	name             : m.auth_name(),
	palette          : m.appearance_colour(),
	style            : m.appearance_style(),
	radius           : m.appearance_radius(),
	allowUserOverride: m.appearance_allow(),
	logo             : m.brand_logo(),
	favicon          : m.brand_favicon(),
	enabled          : m.captcha_enabled(),
	provider         : m.captcha_provider(),
	siteKey          : m.captcha_site_key(),
	secret           : m.captcha_secret(),
	mode             : m.captcha_mode(),
	triggerAfter     : m.captcha_trigger(),
	public           : m.media_field_visibility(),
	tagline          : m.site_tagline_label(),
	email            : m.auth_email(),
	phone            : m.site_phone()
} as Record<string, string> )[ field ] ?? field

const shown = ( value : unknown ) => ( value === null || value === undefined || value === '' ? '—' : typeof value === 'boolean' ? ( value ? m.app_on() : m.app_off() ) : String( value ) )

// "Role: member → admin", "Secret key: changed".
export const auditChangeLines = ( changes : AuditChanges | null ) : string[] => Object.entries( changes ?? {} ).map( ( [ field, change ] ) => `${ auditFieldLabel( field ) }: ${ change ? `${ shown( change[ 0 ] ) } → ${ shown( change[ 1 ] ) }` : m.audit_changed() }` )
