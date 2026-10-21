import { SOCIAL_PROVIDERS, type SocialProvider } from '$lib/social'

/* ―― » Social sign-in ( better-auth's providers ), on per deployment: a provider is on when its
        credentials are in the environment. Anyone may use one — a new person gets an account
        even with AUTH_SIGNUP off — and an account with the same email is linked on first use.

        Env: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET; APPLE_CLIENT_ID ( the Services ID ),
        APPLE_CLIENT_SECRET ( a JWT, at most six months: bun run apple:secret ), optional
        APPLE_APP_BUNDLE_IDENTIFIER for sign-in from an iOS app. Each provider's app lists the
        callback https://<host>/api/auth/callback/<provider> — every workspace host, in
        shared tenancy. */
export function socialProviders( env : Record<string, string | undefined> = process.env ) {
	// The social module off ( config/modules.ts ): no providers, whatever the environment says.
	if ( !MODULES.social )
		return {}

	return {
		...( env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } } : {} ),
		...( env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET ? { apple: { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET, appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER || undefined } } : {} )
	}
}

// The providers this deployment offers, in the template's order.
export const enabledSocialProviders = () : SocialProvider[] => {
	const configured = socialProviders()

	return SOCIAL_PROVIDERS.filter( ( id ) => id in configured )
}
