import { isEmptyRichText, mediaIdsIn, parseRichText } from '#lib/editor/document.js'
import type { RichText } from '#lib/editor/schema.js'
import { baseLocale, getLocale } from '#lib/paraglide/runtime.js'
import { currentTenant, db, tenantTransaction } from '#lib/server/db/index.js'
import type { SitePageKey } from '#lib/site.js'

/* ―― » The pages' rich text, apart from site.ts: the public site's chrome and sign-up import
        that, and must build without the editor. Only the page routes import this, and they
        are the editor module's too ( config/modules.ts ). */

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
