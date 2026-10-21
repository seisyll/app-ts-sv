import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import nodemailer from 'nodemailer'
import { dev } from '$app/environment'
import { parseRichText } from '$lib/editor/document'
import type { MailSettingsInput, MailTemplateInput } from '$lib/mail'
import { m } from '$lib/paraglide/messages'
import { getLocale } from '$lib/paraglide/runtime'
import { currentTenant, db } from '$lib/server/db'
import { moduleActive } from '$lib/server/modules'
import type { MailSetting } from '$lib/server/db/generated/client'
import { tenancy } from '$lib/server/tenant'
import { appUrl } from '$lib/server/url'
import { record } from './outbox'
import { defaultMailContent, MAIL_TEMPLATES, renderMail, type MailContent, type MailTemplateKey } from './templates'

export { defaultMailContent, isMailTemplateKey, MAIL_TEMPLATE_KEYS, MAIL_TEMPLATES, mailVariables, renderMail, sampleMailValues, type MailTemplateKey } from './templates'

/* ―― » Outgoing mail through the WORKSPACE's own SMTP server ( Settings → Mail ); there is no
        deployment-wide fallback. Without one, mail is "not set up": features that need it
        hide ( forgot password ) or ask for something else ( a password instead of an
        invite ) — except in dev, where everything goes to the outbox ( /hello/mail ).

        ponytail: one SMTP connection per email, sent inside the request that caused it. A
        queue with retries ( and pooled connections ) when volume or slow servers matter. */

// The workspace has no mail server ( and this isn't dev ).
export class MailNotConfiguredError extends Error {
	constructor() {
		super( m.mail_not_configured() )
	}
}

export type MailRecipient = { email : string, name ?: string | null }

// The settings form's view: never the password, only whether one is stored.
export type MailSettingsView = Omit<MailSettingsInput, 'password'> & { hasPassword : boolean }

// BETTER_AUTH_SECRET encrypts stored SMTP passwords; auth refuses to start without it.
// Rotating it makes them unreadable: re-enter the password in Settings → Mail.
const key = () => process.env.BETTER_AUTH_SECRET ?? ''

export async function loadMailSettings() : Promise<MailSettingsView | null> {
	const setting = await db.mailSetting.findFirst()

	return setting && {
		host       : setting.host,
		port       : setting.port,
		security   : setting.security as MailSettingsInput[ 'security' ],
		username   : setting.username ?? '',
		fromName   : setting.fromName,
		fromEmail  : setting.fromEmail,
		hasPassword: !!setting.password
	}
}

export async function saveMailSettings( input : MailSettingsInput ) : Promise<void> {
	const { password, ...rest } = input
	const data = {
		...rest,
		username: input.username || null,
		// Blank keeps the stored password; no username means no login at all.
		...( !input.username ? { password: null } : password ? { password: await symmetricEncrypt( { key: key(), data: password } ) } : {} )
	}

	await db.mailSetting.upsert( { where: { tenantId: ( await currentTenant() ).id }, create: data, update: data } )
}

// Can this workspace send mail? Needs the module; then always in dev ( the outbox takes it ),
// otherwise once a mail server is set up.
export async function mailReady() : Promise<boolean> {
	if ( !MODULES.mail || !await moduleActive( 'mail' ) )
		return false

	return dev || !!( await db.mailSetting.findFirst( { select: { id: true } } ) )
}

// The workspace's wording for an email in the current language, or null for the default.
export async function loadMailTemplate( key : MailTemplateKey ) : Promise<MailContent | null> {
	const row = await db.mailTemplate.findFirst( { where: { key, locale: getLocale() }, select: { subject: true, body: true } } )
	// Stored documents were valid when saved; one the schema has since outgrown reads as the default.
	const body = row && parseRichText( row.body )

	return row && body ? { subject: row.subject, body } : null
}

export async function saveMailTemplate( key : MailTemplateKey, input : MailTemplateInput ) : Promise<void> {
	const locale = getLocale()

	await db.mailTemplate.upsert( {
		where : { tenantId_key_locale: { tenantId: ( await currentTenant() ).id, key, locale } },
		create: { key, locale, ...input },
		update: input
	} )
}

// Back to the default ( in the current language ).
export async function resetMailTemplate( key : MailTemplateKey ) : Promise<void> {
	await db.mailTemplate.deleteMany( { where: { key, locale: getLocale() } } )
}

// Which emails this workspace has reworded, in the current language.
export async function customisedMailTemplates() : Promise<Set<string>> {
	const rows = await db.mailTemplate.findMany( { where: { locale: getLocale() }, select: { key: true } } )

	return new Set( rows.map( ( row ) => row.key ) )
}

/* ―― » Send one email from the catalog, worded the workspace's way. `name` and `workspace`
        are filled in for every email. Throws when the server refuses, or with
        MailNotConfiguredError — callers that must not fail ( notifications, password
        resets ) catch it. */
export async function sendMail( { to, template, values = {} } : { to : MailRecipient, template : MailTemplateKey, values ?: Record<string, string> } ) : Promise<void> {
	if ( !MODULES.mail || !await moduleActive( 'mail' ) )
		throw new MailNotConfiguredError()

	const [ setting, content, tenant ] = await Promise.all( [ db.mailSetting.findFirst(), MAIL_TEMPLATES[ template ].editable ? loadMailTemplate( template ) : null, currentTenant() ] )
	const mail = renderMail( template, {
		content: content ?? defaultMailContent( template ),
		values : { name: to.name ?? '', workspace: tenant.name, ...values },
		baseUrl: appUrl()
	} )

	if ( dev )
		record( { workspace: tenant.name, to: to.email, ...mail, sent: !!setting } )

	if ( !setting ) {
		if ( dev )
			return

		throw new MailNotConfiguredError()
	}

	await ( await transport( setting ) ).sendMail( {
		from: { name: setting.fromName, address: setting.fromEmail },
		to  : { name: to.name ?? '', address: to.email },
		...mail
	} )
}

async function transport( setting : MailSetting ) {
	return nodemailer.createTransport( {
		host      : await connectableHost( setting.host ),
		port      : setting.port,
		secure    : setting.security === 'tls',
		requireTLS: setting.security === 'starttls',
		ignoreTLS : setting.security === 'none',
		// The certificate is checked against the NAME, even when connecting to its address.
		tls       : { servername: setting.host },
		auth      : setting.username ? { user: setting.username, pass: setting.password ? await symmetricDecrypt( { key: key(), data: setting.password } ) : '' } : undefined,

		connectionTimeout: 10_000,
		greetingTimeout  : 10_000,
		socketTimeout    : 20_000
	} )
}

let privateRanges : BlockList | undefined

// Built on first use: nothing runs when this module is imported ( see config/modules.ts ).
function isPrivate( address : string ) : boolean {
	if ( !privateRanges ) {
		privateRanges = new BlockList()

		for ( const [ net, prefix ] of [ [ '0.0.0.0', 8 ], [ '10.0.0.0', 8 ], [ '100.64.0.0', 10 ], [ '127.0.0.0', 8 ], [ '169.254.0.0', 16 ], [ '172.16.0.0', 12 ], [ '192.168.0.0', 16 ] ] as const )
			privateRanges.addSubnet( net, prefix, 'ipv4' )

		for ( const [ net, prefix ] of [ [ '::', 128 ], [ '::1', 128 ], [ 'fc00::', 7 ], [ 'fe80::', 10 ] ] as const )
			privateRanges.addSubnet( net, prefix, 'ipv6' )
	}

	return privateRanges.check( address, isIP( address ) === 6 ? 'ipv6' : 'ipv4' )
}

/* ―― » Shared tenancy: a workspace admin is not the server's admin, so their SMTP host must be
        a public address — or "send a test email" becomes a probe of the internal network.
        The checked address is the one connected to: a second lookup could answer otherwise.
        Single tenancy trusts its admin ( a local relay is normal there ). */
export async function connectableHost( host : string ) : Promise<string> {
	if ( tenancy() !== 'shared' )
		return host

	const address = ( await lookup( host ) ).address.replace( /^::ffff:/i, '' )

	if ( isPrivate( address ) )
		throw new Error( m.mail_host_private() )

	return address
}
