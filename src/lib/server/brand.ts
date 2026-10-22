import type { Brand, BrandSetting } from '#lib/brand.js'
import { mediaUrl } from '#lib/media.js'
import { currentTenant, db, tenantTransaction, type TenantRef } from '#lib/server/db/index.js'
import { activeModules } from '#lib/server/modules.js'

// The stored ids, for the settings form. No row yet: none.
export async function loadBrandSetting() : Promise<BrandSetting> {
	const row = await db.appearanceSetting.findFirst( { select: { logoId: true, faviconId: true } } )

	return { logo: row?.logoId ?? null, favicon: row?.faviconId ?? null }
}

// The logo and favicon are the appearance module's, and they're images from the media
// library: both modules on, in this build and for this workspace.
export async function brandImagesOn() : Promise<boolean> {
	if ( !MODULES.appearance || !MODULES.media )
		return false

	const active = await activeModules()

	return active.includes( 'appearance' ) && active.includes( 'media' )
}

/* ―― » For every page's chrome ( the root layout ). The public site and the playground must
        render with no database and no tenant — a fresh checkout, a shared deployment's bare
        domain — so any failure here means "no brand", and each surface falls back to its
        own mark. Without the modules for the images, the name alone. */
export async function loadBrand( tenant : () => Promise<TenantRef> ) : Promise<Brand | null> {
	try {
		const [ { name }, setting, images ] = await Promise.all( [ tenant(), loadBrandSetting(), brandImagesOn() ] )
		const url = ( id : string | null ) => ( images && id ? mediaUrl( id, 'thumb' ) : null )

		return { name, logo: url( setting.logo ), favicon: url( setting.favicon ) }
	} catch {
		return null
	}
}

/* ―― » Save the logo and favicon. Each must be an image this workspace has ( RLS ); the
        field that isn't is answered, nothing is written. Both are made public in the same
        transaction: a visitor's browser fetches them without a session. Clearing one
        leaves its file public — it may be in use elsewhere. */
export async function saveBrand( setting : BrandSetting ) : Promise<keyof BrandSetting | null> {
	const ids = [ setting.logo, setting.favicon ].filter( ( id ) => id !== null )
	const images = new Set( ( await db.media.findMany( { where: { id: { in: ids }, kind: 'image' }, select: { id: true } } ) ).map( ( row ) => row.id ) )
	const invalid = ( [ 'logo', 'favicon' ] as const ).find( ( field ) => setting[ field ] !== null && !images.has( setting[ field ] ) )

	if ( invalid )
		return invalid

	const data = { logoId: setting.logo, faviconId: setting.favicon }
	const { id: tenantId } = await currentTenant()

	await tenantTransaction( async( tx ) => {
		await tx.media.updateMany( { where: { id: { in: ids } }, data: { public: true } } )
		await tx.appearanceSetting.upsert( { where: { tenantId }, create: data, update: data } )
	} )

	return null
}
