import ChartNoAxesColumnIcon from '@lucide/svelte/icons/chart-no-axes-column'
import LanguagesIcon from '@lucide/svelte/icons/languages'
import PaletteIcon from '@lucide/svelte/icons/palette'
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'
import UsersIcon from '@lucide/svelte/icons/users'
import ZapIcon from '@lucide/svelte/icons/zap'
import { APP } from '$lib/config'
import { money } from '$lib/format'
import { m } from '$lib/paraglide/messages'
import { SITE_PAGES, type PublicSite } from '$lib/site'
import type { HomeContent, Site } from './contract'

/* ―― » The public site's words — this app's marketing copy, shared by every theme. Edit
        the messages ( site_* in messages/*.json ) to make it yours; themes only decide how
        it looks. Functions, not constants: they run in the request's locale. */

// `site`: what the workspace set in Settings → Public site ( null: none, or no workspace ).
type Options = { signUp : boolean, logo ?: string | null, site ?: PublicSite | null }

const start = ( { signUp } : Options ) => ( signUp ? { label: m.site_start(), href: '/signup' } : { label: m.site_sign_in(), href: '/login' } )
const price = ( value : number ) => money( value, APP.currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 } )

export function siteChrome( options : Options ) : Site {
	const { site } = options
	const pages = ( site?.pages ?? [] ).map( ( key ) => ( { label: SITE_PAGES[ key ](), href: `/${ key }` } ) )
	const nav = [
		{ label: m.site_nav_features(), href: '#features' },
		{ label: m.site_nav_how(), href: '#how' },
		{ label: m.site_nav_pricing(), href: '#pricing' },
		{ label: m.site_nav_faq(), href: '#faq' }
	]

	return {
		name   : APP.name,
		logo   : options.logo,
		nav,
		signIn : { label: m.site_sign_in(), href: '/login' },
		start  : start( options ),
		columns: [
			{ title: m.site_footer_product(), links: [ nav[ 0 ], nav[ 2 ], nav[ 3 ] ] },
			{ title: m.site_footer_account(), links: [ { label: m.site_sign_in(), href: '/login' }, ...( options.signUp ? [ start( options ) ] : [] ) ] },
			...( pages.length ? [ { title: m.site_footer_company(), links: pages } ] : [] )
		],
		tagline: site?.tagline ?? m.site_tagline(),
		legal  : m.site_legal( { year: new Date().getFullYear(), name: APP.name } ),
		social : site?.social ?? [],
		contact: [
			...( site?.email ? [ { label: site.email, href: `mailto:${ site.email }` } ] : [] ),
			...( site?.phone ? [ { label: site.phone, href: `tel:${ site.phone.replace( /[^\d+]/g, '' ) }` } ] : [] )
		]
	}
}

// Home renders the anchors the nav links to: #features, #how, #pricing, #faq.
export function homeContent( options : Options ) : HomeContent {
	const cta = start( options )
	// A plan always says "Get started", even when that means signing in.
	const choose = { label: m.site_start(), href: cta.href }

	return {
		hero: {
			eyebrow  : m.site_hero_eyebrow(),
			title    : m.site_hero_title(),
			accent   : m.site_hero_accent(),
			lead     : m.site_hero_lead(),
			primary  : cta,
			secondary: { label: m.site_hero_secondary(), href: '#pricing' }
		},
		logos: {
			title: m.site_logos_title(),
			// Placeholder customers ( sample company names ) — replace with real ones or drop.
			names: [ 'Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wingtip', 'Litware' ]
		},
		features: {
			eyebrow: m.site_features_eyebrow(),
			title  : m.site_features_title(),
			lead   : m.site_features_lead(),
			items  : [
				{ icon: UsersIcon, title: m.site_feature_tenants(), text: m.site_feature_tenants_text() },
				{ icon: ShieldCheckIcon, title: m.site_feature_roles(), text: m.site_feature_roles_text() },
				{ icon: ChartNoAxesColumnIcon, title: m.site_feature_tables(), text: m.site_feature_tables_text() },
				{ icon: LanguagesIcon, title: m.site_feature_languages(), text: m.site_feature_languages_text() },
				{ icon: ZapIcon, title: m.site_feature_fast(), text: m.site_feature_fast_text() },
				{ icon: PaletteIcon, title: m.site_feature_look(), text: m.site_feature_look_text() }
			]
		},
		steps: {
			eyebrow: m.site_steps_eyebrow(),
			title  : m.site_steps_title(),
			lead   : m.site_steps_lead(),
			link   : { label: m.site_steps_link(), href: '#pricing' },
			items  : [
				{ tag: m.site_step_1_tag(), title: m.site_step_1(), text: m.site_step_1_text() },
				{ tag: m.site_step_2_tag(), title: m.site_step_2(), text: m.site_step_2_text() },
				{ tag: m.site_step_3_tag(), title: m.site_step_3(), text: m.site_step_3_text() }
			]
		},
		stack: {
			eyebrow: m.site_stack_eyebrow(),
			title  : m.site_stack_title(),
			about  : m.site_stack_about(),
			text   : m.site_stack_text(),
			points : [ m.site_stack_point_1(), m.site_stack_point_2(), m.site_stack_point_3() ]
		},
		stats: [
			{ value: 99.99, decimals: 2, suffix: '%', label: m.site_stat_uptime() },
			{ value: 10, suffix: 'k+', label: m.site_stat_users() },
			{ value: 40, suffix: '+', label: m.site_stat_countries() },
			{ value: 24, suffix: '/7', label: m.site_stat_support() }
		],
		testimonials: {
			eyebrow: m.site_testimonials_eyebrow(),
			title  : m.site_testimonials_title(),
			lead   : m.site_testimonials_lead( { name: APP.name } ),
			items  : [
				{ quote: m.site_quote_1(), name: 'Maya Chen', role: m.site_quote_1_role(), featured: true },
				{ quote: m.site_quote_2(), name: 'Daniel Okafor', role: m.site_quote_2_role() },
				{ quote: m.site_quote_3(), name: 'Sari Wijaya', role: m.site_quote_3_role() }
			]
		},
		pricing: {
			eyebrow: m.site_pricing_eyebrow(),
			title  : m.site_pricing_title(),
			lead   : m.site_pricing_lead(),
			popular: m.site_pricing_popular(),
			period : m.site_pricing_period(),
			plans  : [
				{
					name    : m.site_plan_starter(),
					price   : price( 0 ),
					text    : m.site_plan_starter_text(),
					features: [ m.site_plan_starter_1(), m.site_plan_starter_2(), m.site_plan_starter_3() ],
					cta     : choose
				},
				{
					name    : m.site_plan_team(),
					price   : price( 29 ),
					text    : m.site_plan_team_text(),
					features: [ m.site_plan_team_1(), m.site_plan_team_2(), m.site_plan_team_3(), m.site_plan_team_4() ],
					cta     : choose,
					popular : true
				},
				{
					name    : m.site_plan_business(),
					price   : price( 99 ),
					text    : m.site_plan_business_text(),
					features: [ m.site_plan_business_1(), m.site_plan_business_2(), m.site_plan_business_3(), m.site_plan_business_4() ],
					cta     : choose
				}
			]
		},
		faq: {
			eyebrow: m.site_faq_eyebrow(),
			title  : m.site_faq_title(),
			items  : [
				{ question: m.site_faq_1(), answer: m.site_faq_1_answer() },
				{ question: m.site_faq_2(), answer: m.site_faq_2_answer() },
				{ question: m.site_faq_3(), answer: m.site_faq_3_answer() },
				{ question: m.site_faq_4(), answer: m.site_faq_4_answer() },
				{ question: m.site_faq_5(), answer: m.site_faq_5_answer() }
			]
		},
		cta: {
			eyebrow  : m.site_cta_eyebrow(),
			title    : m.site_cta_title(),
			accent   : m.site_cta_accent(),
			lead     : m.site_cta_lead(),
			primary  : cta,
			// With sign-up off the primary already says "Sign in".
			secondary: options.signUp ? { label: m.site_sign_in(), href: '/login' } : { label: m.site_hero_secondary(), href: '#pricing' },
			note     : m.site_cta_note()
		}
	}
}
