/* ―― » Every optional module the app can ship, the single list ( the fundraiser app's
        extension registry ). Nothing else hard-codes module ids: a client config turns
        them on ( config/clients ), the build drops what's off, and in shared tenancy each
        workspace can switch off what the build ships ( bun run tenant:modules ).

        routes   — route ids the module OWNS ( folders under src/routes, groups included ).
                   Off at build: every file under them is replaced by a 404 stub, so the
                   module's pages, endpoints and their imports never enter the bundle. Off
                   for a workspace: hooks.server.ts answers 404 there. Code elsewhere that
                   merely uses a module guards itself with `if ( MODULES.<id> )`.
        requires — modules it can't work without; a config that breaks this fails loudly.
        whenOff  — where its routes send people instead of a 404.

        Adding a module: an entry here ( an id that is a valid identifier ), a label in
        src/lib/modules ( moduleLabel ), then guard its entry points elsewhere. */

export type ModuleDefinition = {
	description : string
	routes      : readonly string[]
	// Module ids ( checked when a client config is resolved ).
	requires ?  : readonly string[]
	whenOff ?   : string
}

export const MODULES_REGISTRY = {
	site: {
		description: 'The public site ( landing page ) in the theme the client config picks',
		routes     : [ '/(site)', '/app/settings/site', '/(dev)/hello/site', '/(dev)/hello/seo' ],
		whenOff    : '/app'
	},
	users: {
		description: 'User administration: list, add, invite, re-role, ban and delete',
		routes     : [ '/app/users', '/api/users' ]
	},
	appearance: {
		description: 'Palette, component style and radius, per workspace and per person; the workspace logo and favicon ( with media )',
		routes     : [ '/app/settings/appearance', '/api/appearance', '/(dev)/hello/brand' ]
	},
	media: {
		description: 'Uploads, the media library, the image field, the editor\'s image picker and uploaded avatars',
		routes     : [ '/app/media', '/api/media', '/media', '/api/account/avatar', '/(dev)/hello/media', '/(dev)/api/hello/media', '/(dev)/hello/avatar' ]
	},
	editor: {
		description: 'Rich text: the TipTap editor, its validation and its HTML / email renders',
		routes     : [ '/(dev)/hello/editor', '/(dev)/api/hello/editor' ]
	},
	notifications: {
		description: 'The bell, the inbox and per-type preferences',
		routes     : [ '/app/notifications', '/app/account/notifications', '/api/notifications', '/(dev)/hello/notifications', '/(dev)/api/hello/notifications' ]
	},
	audit: {
		description: 'The audit trail: who changed what in the workspace, filterable and exportable',
		routes     : [ '/app/settings/audit', '/api/audit', '/(dev)/hello/audit' ]
	},
	signins: {
		description: 'The sign-in log: every attempt, its outcome and where it came from, for admins and for each person',
		routes     : [ '/app/settings/sign-ins', '/api/sign-ins', '/(dev)/hello/sign-ins' ]
	},
	captcha: {
		description: 'A captcha on sign-in ( after failed attempts, or always ), sign-up and forgot-password, set per workspace',
		routes     : [ '/app/settings/security', '/(dev)/hello/captcha' ]
	},
	social: {
		description: 'Sign-in with Google and Apple, each when its credentials are in the environment, and connected accounts',
		routes     : [ '/(auth)/login/social', '/(dev)/hello/social' ],
		whenOff    : '/login'
	},
	help: {
		description: 'The help centre: articles in Markdown, listed at /app/help and opened over any page',
		routes     : [ '/app/help', '/api/help', '/(dev)/hello/help' ],
		whenOff    : '/app'
	},
	mail: {
		description: 'The workspace\'s SMTP: password reset, email verification, invites, notification emails',
		routes     : [ '/app/settings/mail', '/(auth)/forgot-password', '/(auth)/reset-password', '/(dev)/hello/mail', '/(dev)/api/hello/mail' ],
		requires   : [ 'editor' ]
	}
} as const satisfies Record<string, ModuleDefinition>

export type ModuleId = keyof typeof MODULES_REGISTRY

export const MODULE_IDS = Object.keys( MODULES_REGISTRY ) as ModuleId[]

// The definition, widened ( `as const` makes optional fields awkward to read ).
export const moduleDefinition = ( id : ModuleId ) : ModuleDefinition => MODULES_REGISTRY[ id ]

// Does `routeId` ( SvelteKit's, e.g. /app/media/[id] ) belong to `owned`?
export const routeIsUnder = ( routeId : string, owned : string ) : boolean => routeId === owned || routeId.startsWith( `${ owned }/` )

// The module that owns a route, if any.
export const routeOwner = ( routeId : string | null | undefined ) : ModuleId | undefined =>
	routeId ? MODULE_IDS.find( ( id ) => moduleDefinition( id ).routes.some( ( owned ) => routeIsUnder( routeId, owned ) ) ) : undefined

/* ―― » A set of modules with every one whose requirements are missing taken out — again
        until nothing changes, since dropping one can break another. */
export function withRequirements( on : Iterable<ModuleId> ) : Set<ModuleId> {
	const kept = new Set( on )
	let changed = true

	while ( changed ) {
		changed = false

		for ( const id of kept ) {
			if ( ( moduleDefinition( id ).requires ?? [] ).some( ( need ) => !kept.has( need as ModuleId ) ) ) {
				kept.delete( id )
				changed = true
			}
		}
	}

	return kept
}
