import { getLocale } from '$lib/paraglide/runtime'
import { currentTenant, db } from '$lib/server/db'
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
