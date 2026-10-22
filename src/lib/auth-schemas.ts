import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'

// Auth forms, validated in the browser and again by the form actions.
export const email = v.pipe( v.string(), v.trim(), v.nonEmpty(), v.email() )
export const name = v.pipe( v.string(), v.trim(), v.nonEmpty(), v.maxLength( 60 ) )
// Matches emailAndPassword.minPasswordLength in #lib/server/auth.
export const newPassword = v.pipe( v.string(), v.minLength( 10 ), v.maxLength( 128 ) )

// The captcha's answer, when the page shows one ( set on submit, see CaptchaWidget ).
const captcha = v.optional( v.string(), '' )

export const loginSchema = v.object( {
	email,
	password: v.pipe( v.string(), v.nonEmpty() ),
	captcha
} )

export const signupSchema = v.object( { name, email, password: newPassword, captcha } )

export const forgotSchema = v.object( { email, captcha } )

// Choosing a password from an emailed link: a reset, or accepting an invite.
export const resetSchema = v.pipe(
	v.object( {
		token          : v.pipe( v.string(), v.nonEmpty() ),
		newPassword,
		confirmPassword: v.string()
	} ),
	v.forward(
		v.partialCheck( [ [ 'newPassword' ], [ 'confirmPassword' ] ], ( input ) => input.newPassword === input.confirmPassword, () => m.auth_password_mismatch() ),
		[ 'confirmPassword' ]
	)
)

export const profileSchema = v.object( { name } )

export const passwordSchema = v.pipe(
	v.object( {
		currentPassword    : v.pipe( v.string(), v.nonEmpty() ),
		newPassword,
		confirmPassword    : v.string(),
		revokeOtherSessions: v.optional( v.boolean(), true )
	} ),
	v.forward(
		v.partialCheck( [ [ 'newPassword' ], [ 'confirmPassword' ] ], ( input ) => input.newPassword === input.confirmPassword, () => m.auth_password_mismatch() ),
		[ 'confirmPassword' ]
	)
)
