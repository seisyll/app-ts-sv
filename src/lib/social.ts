/* ―― » Social sign-in, shared by the browser and the server ( src/lib/server/social.ts ): the
        providers the template knows. Which are on is the deployment's call — env credentials. */

export const SOCIAL_PROVIDERS = [ 'google', 'apple' ] as const

export type SocialProvider = ( typeof SOCIAL_PROVIDERS )[ number ]

export const SOCIAL_LABELS : Record<SocialProvider, string> = { google: 'Google', apple: 'Apple' }

export const isSocialProvider = ( value : unknown ) : value is SocialProvider => SOCIAL_PROVIDERS.includes( value as SocialProvider )

// One sign-in method on the profile page: a provider, or the password ( 'credential' ).
export type ConnectedAccount = { provider : SocialProvider, connected : boolean }
