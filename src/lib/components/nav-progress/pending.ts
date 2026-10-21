import { navigating } from '$app/state'

// Whether `href` is the link currently being navigated to — the row-level twin of
// NavProgress. Reactive through `navigating`, so templates can call it directly.
export function isPending( href : string ) : boolean {
	if ( !href || href === '#' )
		return false

	return navigating.to?.url.pathname === href
}
