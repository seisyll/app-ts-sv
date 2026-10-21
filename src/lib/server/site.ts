import { isEmptyRichText, parseRichText } from '$lib/editor/document'
import type { RichText } from '$lib/editor/schema'
import { baseLocale, getLocale } from '$lib/paraglide/runtime'
import { currentTenant, db, tenantTransaction } from '$lib/server/db'
import { SITE_PAGE_KEYS, SOCIAL_NETWORK_IDS, SOCIAL_NETWORKS, type PublicSite, type SitePageKey, type SiteSettingsInput } from '$lib/site'

// The settings form's values. No row yet: all blank.
export async function loadSiteSetting() : Promise<SiteSettingsInput> {
	const row = await db.siteSetting.findFirst()
	const links = ( row?.links ?? {} ) as Record<string, unknown>

	return {
		tagline: row?.tagline ?? '',
		email  : row?.email ?? '',
		phone  : row?.phone ?? '',
		links  : Object.fromEntries( SOCIAL_NETWORK_IDS.map( ( network ) => [ network, typeof links[ network ] === 'string' ? links[ network ] : '' ] ) ) as SiteSettingsInput[ 'links' ]
	}
}

// Blank is stored as null ( and a blank link not at all ), so "not set" has one spelling.
export async function saveSiteSetting( input : SiteSettingsInput ) : Promise<void> {
	const data = {
		tagline: input.tagline || null,
		email  : input.email || null,
		phone  : input.phone || null,
		links  : Object.fromEntries( Object.entries( input.links ).filter( ( [ , href ] ) => href ) )
	}

	await db.siteSetting.upsert( { where: { tenantId: ( await currentTenant() ).id }, create: data, update: data } )
}

/* ―― » A page in the visitor's language, else in the base locale, else in whichever language
        it was written: a policy in one language beats none. Stored documents were valid
        when saved; one the schema has since outgrown reads as unwritten. */
export async function loadSitePage( key : SitePageKey, locale = getLocale() ) : Promise<RichText | null> {
	const rows = await db.sitePage.findMany( { where: { key }, select: { locale: true, body: true } } )
	const rank = ( row : { locale : string } ) => ( row.locale === locale ? 0 : row.locale === baseLocale ? 1 : 2 )
	const row = rows.sort( ( a, b ) => rank( a ) - rank( b ) )[ 0 ]

	return row ? parseRichText( row.body ) : null
}

// The page as it reads in this language — for the editor, which never shows a fallback.
export async function loadSitePageDraft( key : SitePageKey ) : Promise<RichText | null> {
	const row = await db.sitePage.findFirst( { where: { key, locale: getLocale() }, select: { body: true } } )

	return row ? parseRichText( row.body ) : null
}

/* ―― » Save a page in the current language; an empty one is taken down instead. Its images
        go public with it, in the same transaction: a visitor has no session to fetch them
        with ( the logo's rule, src/lib/server/brand.ts ). Only this workspace's files can
        match ( RLS ); an image taken out later stays public — it may be used elsewhere. */
export async function saveSitePage( key : SitePageKey, body : RichText ) : Promise<'saved' | 'removed'> {
	const locale = getLocale()

	if ( isEmptyRichText( body ) ) {
		await db.sitePage.deleteMany( { where: { key, locale } } )

		return 'removed'
	}

	const { id: tenantId } = await currentTenant()

	await tenantTransaction( async( tx ) => {
		await tx.media.updateMany( { where: { id: { in: mediaIdsIn( body ) }, kind: 'image' }, data: { public: true } } )
		await tx.sitePage.upsert( {
			where : { tenantId_key_locale: { tenantId, key, locale } },
			create: { key, locale, body },
			update: { body }
		} )
	} )

	return 'saved'
}

// Which pages this workspace has in the current language — for the settings list.
export async function writtenSitePages() : Promise<SitePageKey[]> {
	const rows = await db.sitePage.findMany( { where: { locale: getLocale() }, select: { key: true } } )

	return SITE_PAGE_KEYS.filter( ( key ) => rows.some( ( row ) => row.key === key ) )
}

// The pages a visitor can read in some language, in SITE_PAGES order.
export async function publishedSitePages() : Promise<SitePageKey[]> {
	const rows = await db.sitePage.findMany( { distinct: [ 'key' ], select: { key: true } } )

	return SITE_PAGE_KEYS.filter( ( key ) => rows.some( ( row ) => row.key === key ) )
}

/* ―― » For the public site's chrome. Like the brand, it must render with no database and no
        tenant ( a fresh checkout, a shared deployment's bare domain ), so a failure here is
        "nothing set" and the site shows its built-in words. */
export async function loadPublicSite() : Promise<PublicSite | null> {
	try {
		const [ setting, pages ] = await Promise.all( [ loadSiteSetting(), MODULES.editor ? publishedSitePages() : [] ] )

		return {
			tagline: setting.tagline || null,
			email  : setting.email || null,
			phone  : setting.phone || null,
			social : SOCIAL_NETWORK_IDS.filter( ( network ) => setting.links[ network ] ).map( ( network ) => ( { network, label: SOCIAL_NETWORKS[ network ], href: setting.links[ network ] } ) ),
			pages
		}
	} catch {
		return null
	}
}

// The media library's files an editor document shows: /media/<id> or /media/<id>/thumb.
function mediaIdsIn( node : unknown, found = new Set<string>() ) : string[] {
	if ( Array.isArray( node ) )
		node.forEach( ( child ) => mediaIdsIn( child, found ) )
	else if ( node && typeof node === 'object' ) {
		const { type, attrs, content } = node as { type ?: string, attrs ?: { src ?: unknown }, content ?: unknown }
		const id = type === 'image' && typeof attrs?.src === 'string' && /^\/media\/([0-9a-f-]{36})(?:\/|$)/.exec( attrs.src )?.[ 1 ]

		if ( id )
			found.add( id )

		mediaIdsIn( content, found )
	}

	return [ ...found ]
}
