import type { Component } from 'svelte'
import type { SocialLink } from '$lib/site'

/* ―― » The public-site theme contract ( from the fundraiser app's themes/contract.ts ).
        A theme is a folder here whose index.ts exports `id`, `Header`, `Footer` and `Home`
        with the props below. The (site) routes import it through `$theme` and pass the same
        data to whichever theme is active, so themes stay drop-in swappable.

        Themes own the LOOK. The words come from content.ts ( localised, app-level ), so
        changing the copy never means editing every theme. Style a theme under its
        `.theme-<id>` class: the wrapper carries it, and nothing leaks into /app. */

export type SiteLink = { label : string, href : string }

// What Header and Footer receive.
export type Site = {
	name    : string
	// The workspace's logo URL, when it has one; otherwise a theme shows its own mark ( or none ).
	logo ?  : string | null
	nav     : SiteLink[]
	signIn  : SiteLink
	// The main call to action: sign-up when it's on, else sign-in.
	start   : SiteLink
	columns : { title : string, links : SiteLink[] }[]
	tagline : string
	legal   : string
	// The workspace's own details ( Settings → Public site ); empty when none are set.
	social  : SocialLink[]
	contact : SiteLink[]
}

// Titles may hold "\n" for a line break; `accent` is the emphasised end of a title.
export type HomeContent = {
	hero : { eyebrow : string, title : string, accent : string, lead : string, primary : SiteLink, secondary : SiteLink }
	logos : { title : string, names : string[] }
	features : { eyebrow : string, title : string, lead : string, items : { icon : Component, title : string, text : string }[] }
	steps : { eyebrow : string, title : string, lead : string, link : SiteLink, items : { tag : string, title : string, text : string }[] }
	stack : { eyebrow : string, title : string, about : string, text : string, points : string[] }
	stats : { value : number, decimals ?: number, suffix ?: string, label : string }[]
	testimonials : { eyebrow : string, title : string, lead : string, items : { quote : string, name : string, role : string, featured ?: boolean }[] }
	pricing : {
		eyebrow : string
		title   : string
		lead    : string
		popular : string
		period  : string
		plans   : { name : string, price : string, text : string, features : string[], cta : SiteLink, popular ?: boolean }[]
	}
	faq : { eyebrow : string, title : string, items : { question : string, answer : string }[] }
	cta : { eyebrow : string, title : string, accent : string, lead : string, primary : SiteLink, secondary : SiteLink, note : string }
}

export type ThemeModule = {
	id         : string
	// A 1200×630 picture for link previews of public pages that bring none of their own.
	shareImage : string
	Header     : Component<{ site : Site }>
	Footer     : Component<{ site : Site }>
	Home       : Component<{ content : HomeContent }>
}
