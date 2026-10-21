// App-wide defaults. The default *locale* is not here: paraglide owns it as
// `baseLocale` in project.inlang/settings.json ( the single switch for it ).
export const APP = {
	name    : 'App',
	currency: 'USD',
	// Fixed zone so server and browser render the same date ( no hydration mismatch ).
	timeZone: 'UTC'
} as const
