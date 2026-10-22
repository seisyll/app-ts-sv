import * as v from 'valibot'
import { richTextSchema } from '#lib/editor/document.js'

// One page's document; an empty one takes the page down. Here, not in #lib/site, so the
// public site's bundle never carries the editor's schema.
export const sitePageSchema = v.object( { body: richTextSchema } )
