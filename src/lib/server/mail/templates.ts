import { generateText, type JSONContent } from '@tiptap/core'
import { renderEmailHTML } from '#lib/editor/render.js'
import { richTextExtensions, type RichText } from '#lib/editor/schema.js'
import { m } from '#lib/paraglide/messages.js'

/* ―― » Every email the app sends ( like the notification catalog ): its variables, its default
        subject and body, and the button it ends with. A workspace can reword the subject and
        body per language ( MailTemplate rows ); the button and the link it carries are fixed,
        so a reworded email can't lose the one thing it is for.

        Defaults are messages with the {{variables}} passed in as text, so an admin who starts
        from the default sees them as variables in the editor. Adding an email: an entry here,
        then sendMail( { to, template, values } ) where it happens. */

const VARIABLES = {
	name     : () => m.mail_var_name(),
	workspace: () => m.mail_var_workspace(),
	link     : () => m.mail_var_link(),
	inviter  : () => m.mail_var_inviter(),
	title    : () => m.mail_var_title(),
	body     : () => m.mail_var_body()
} as const

export type MailVariable = keyof typeof VARIABLES

type Definition = {
	label       : () => string
	description : () => string
	variables   : readonly MailVariable[]
	subject     : () => string
	body        : () => RichText
	// The button's words; it opens values.link. None for an email without a link.
	action ?    : () => string
	// Shown in Settings → Mail for rewording. The test email isn't.
	editable    : boolean
}

const TOKEN = /\{\{([a-z][a-z0-9_]*)\}\}/g
const token = ( name : MailVariable ) => `{{${ name }}}`

// A paragraph from text with {{variables}} in it, as the editor would store it.
function paragraph( text : string ) : JSONContent {
	const content : JSONContent[] = []
	let last = 0

	for ( const match of text.matchAll( TOKEN ) ) {
		if ( match.index > last )
			content.push( { type: 'text', text: text.slice( last, match.index ) } )

		content.push( { type: 'variable', attrs: { name: match[ 1 ] } } )
		last = match.index + match[ 0 ].length
	}

	if ( last < text.length )
		content.push( { type: 'text', text: text.slice( last ) } )

	return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

const doc = ( ...paragraphs : string[] ) : RichText => ( { type: 'doc', content: paragraphs.map( paragraph ) } )

const hello = () => m.mail_hello( { name: token( 'name' ) } )

export const MAIL_TEMPLATES = {
	'password.reset': {
		label      : () => m.mail_reset_label(),
		description: () => m.mail_reset_desc(),
		variables  : [ 'name', 'workspace', 'link' ],
		subject    : () => m.mail_reset_subject( { workspace: token( 'workspace' ) } ),
		body       : () => doc( hello(), m.mail_reset_body( { workspace: token( 'workspace' ) } ), m.mail_reset_ignore() ),
		action     : () => m.mail_reset_action(),
		editable   : true
	},
	'email.verify': {
		label      : () => m.mail_verify_label(),
		description: () => m.mail_verify_desc(),
		variables  : [ 'name', 'workspace', 'link' ],
		subject    : () => m.mail_verify_subject( { workspace: token( 'workspace' ) } ),
		body       : () => doc( hello(), m.mail_verify_body( { workspace: token( 'workspace' ) } ), m.mail_verify_ignore() ),
		action     : () => m.mail_verify_action(),
		editable   : true
	},
	'user.invite': {
		label      : () => m.mail_invite_label(),
		description: () => m.mail_invite_desc(),
		variables  : [ 'name', 'workspace', 'inviter', 'link' ],
		subject    : () => m.mail_invite_subject( { inviter: token( 'inviter' ), workspace: token( 'workspace' ) } ),
		body       : () => doc( hello(), m.mail_invite_body( { inviter: token( 'inviter' ), workspace: token( 'workspace' ) } ), m.mail_invite_expiry() ),
		action     : () => m.mail_invite_action(),
		editable   : true
	},
	notification: {
		label      : () => m.mail_notification_label(),
		description: () => m.mail_notification_desc(),
		variables  : [ 'name', 'workspace', 'title', 'body', 'link' ],
		subject    : () => token( 'title' ),
		body       : () => doc( hello(), token( 'title' ), token( 'body' ) ),
		action     : () => m.mail_notification_action(),
		editable   : true
	},
	'mail.test': {
		label      : () => m.mail_test_label(),
		description: () => m.mail_test_desc(),
		variables  : [ 'workspace' ],
		subject    : () => m.mail_test_subject( { workspace: token( 'workspace' ) } ),
		body       : () => doc( m.mail_test_body( { workspace: token( 'workspace' ) } ) ),
		editable   : false
	}
} as const satisfies Record<string, Definition>

export type MailTemplateKey = keyof typeof MAIL_TEMPLATES

export const MAIL_TEMPLATE_KEYS = Object.keys( MAIL_TEMPLATES ) as MailTemplateKey[]

export const isMailTemplateKey = ( key : string ) : key is MailTemplateKey => Object.hasOwn( MAIL_TEMPLATES, key )

// The variables an email offers, labelled for the editor.
export const mailVariables = ( key : MailTemplateKey ) => ( MAIL_TEMPLATES[ key ] as Definition ).variables.map( ( name ) => ( { name, label: VARIABLES[ name ]() } ) )

export type MailContent = { subject : string, body : RichText }

export const defaultMailContent = ( key : MailTemplateKey ) : MailContent => ( { subject: MAIL_TEMPLATES[ key ].subject(), body: MAIL_TEMPLATES[ key ].body() } )

// Made-up values for previews, so a variable shows what it will become.
export const sampleMailValues = () : Record<MailVariable, string> => ( {
	name     : 'Ada Lovelace',
	workspace: 'Acme Inc',
	link     : 'https://example.test/link',
	inviter  : 'Grace Hopper',
	title    : m.mail_sample_title(),
	body     : m.mail_sample_body()
} )

export type RenderedMail = { subject : string, html : string, text : string }

const escape = ( text : string ) => text.replace( /[&<>"']/g, ( char ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' } )[ char ]! )

const FONT = 'font-family:-apple-system,\'Segoe UI\',Helvetica,Arial,sans-serif;'

/* ―― » One email, ready to send: subject, HTML and its plain-text twin. Pure — the caller
        picks the content ( the workspace's or the default ) and the values. Like
        renderEmailHTML, the layout is tables and inline styles with literal colours: mail
        clients read neither CSS variables nor most of CSS. */
export function renderMail( key : MailTemplateKey, { content = defaultMailContent( key ), values, baseUrl } : { content ?: MailContent, values : Record<string, string>, baseUrl : string } ) : RenderedMail {
	const definition = MAIL_TEMPLATES[ key ] as Definition
	// A header can't carry a line break ( header injection ): values come from users.
	const subject = content.subject.replace( TOKEN, ( whole, name : string ) => values[ name ] ?? whole ).replace( /[\r\n]+/g, ' ' ).trim()
	const action = definition.action && values.link ? { label: definition.action(), href: values.link } : null
	const workspace = values.workspace ?? ''

	const button = action
		? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:#18181b;"><a href="${ escape( action.href ) }" style="display:inline-block;padding:12px 20px;${ FONT }font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${ escape( action.label ) }</a></td></tr></table>`
			+ `<p style="margin:0;${ FONT }font-size:13px;line-height:1.5;color:#71717a;word-break:break-all;">${ escape( m.mail_link_fallback() ) } <a href="${ escape( action.href ) }" style="color:#2563eb;">${ escape( action.href ) }</a></p>`
		: ''

	const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
		+ `<title>${ escape( subject ) }</title></head><body style="margin:0;padding:0;background:#f4f4f5;">`
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;">'
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;"><tr><td style="padding:32px;">'
		+ `<p style="margin:0 0 24px;${ FONT }font-size:14px;font-weight:600;color:#71717a;">${ escape( workspace ) }</p>`
		+ renderEmailHTML( content.body, { baseUrl, values } )
		+ button
		+ '</td></tr></table>'
		+ `<p style="margin:16px 0 0;${ FONT }font-size:12px;color:#a1a1aa;">${ escape( m.mail_footer( { workspace } ) ) }</p>`
		+ '</td></tr></table></body></html>'

	const text = [
		workspace,
		generateText( content.body, richTextExtensions, {
			blockSeparator : '\n\n',
			textSerializers: { variable: ( { node } ) => values[ node.attrs.name ] ?? `{{${ node.attrs.name }}}` }
		} ),
		action ? `${ action.label }: ${ action.href }` : '',
		m.mail_footer( { workspace } )
	].filter( Boolean ).join( '\n\n' )

	return { subject, html, text }
}
