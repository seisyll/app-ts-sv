import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

/* ―― » Sign in with Apple's client secret: a JWT signed with your key, valid at most six
        months — so this runs again before it lapses ( set a reminder ). Prints the value for
        APPLE_CLIENT_SECRET.

          bun run apple:secret -- --team ABCDE12345 --key-id XYZ987 --client-id com.example.web --key AuthKey_XYZ987.p8

        team: your Apple Team ID; key-id and key: a Sign in with Apple key ( .p8, from
        Certificates, Identifiers & Profiles → Keys ); client-id: the Services ID. */
const { values } = parseArgs( { options: { 'team': { type: 'string' }, 'key-id': { type: 'string' }, 'client-id': { type: 'string' }, 'key': { type: 'string' }, 'days': { type: 'string', default: '180' } } } )
const { team, 'key-id': keyId, 'client-id': clientId, key: keyFile } = values

if ( !team || !keyId || !clientId || !keyFile )
	throw new Error( 'Usage: bun run apple:secret -- --team <Team ID> --key-id <Key ID> --client-id <Services ID> --key <AuthKey.p8> [ --days 180 ]' )

const days = Math.min( 180, Number( values.days ) || 180 )
const pem = readFileSync( keyFile, 'utf8' ).replace( /-----[^-]+-----|\s/g, '' )
const key = await crypto.subtle.importKey( 'pkcs8', Buffer.from( pem, 'base64' ), { name: 'ECDSA', namedCurve: 'P-256' }, false, [ 'sign' ] )
const now = Math.floor( Date.now() / 1000 )
const part = ( value : object ) => Buffer.from( JSON.stringify( value ) ).toString( 'base64url' )
const unsigned = `${ part( { alg: 'ES256', kid: keyId } ) }.${ part( { iss: team, iat: now, exp: now + days * 86_400, aud: 'https://appleid.apple.com', sub: clientId } ) }`
// WebCrypto signs ECDSA as r‖s, which is what a JWT wants.
const signature = Buffer.from( await crypto.subtle.sign( { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode( unsigned ) ) ).toString( 'base64url' )

console.log( `${ unsigned }.${ signature }` )
console.error( `· valid until ${ new Date( ( now + days * 86_400 ) * 1000 ).toISOString().slice( 0, 10 ) }` )
