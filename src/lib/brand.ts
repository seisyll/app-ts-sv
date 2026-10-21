import * as v from 'valibot'

/* ―― » The workspace's brand: its name, a logo ( the sidebar, the public site, sign-in ) and
        a favicon ( the browser tab ). Both images are media ids, made public when saved —
        a signed-out visitor sees them too. Pages get URLs ( `Brand` ); the settings form
        edits ids ( `BrandSetting` ). */
export type Brand = {
	name    : string
	logo    : string | null
	favicon : string | null
}

const mediaId = v.nullable( v.pipe( v.string(), v.uuid() ) )

export const brandSchema = v.object( {
	logo   : mediaId,
	favicon: mediaId
} )

export type BrandSetting = v.InferOutput<typeof brandSchema>
