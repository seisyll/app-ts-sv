import type * as Mail from './index'

/* ―― » The mail module as the rest of the app reaches it — import these, not ./index, from
        code outside the module. The module loads only when this build ships it
        ( `MODULES.mail` ), so a build without it has no path to its code, nodemailer or the
        editor it renders with. */

export async function mailReady() : Promise<boolean> {
	return MODULES.mail ? ( await import( './index' ) ).mailReady() : false
}

// Throws like sendMail does, MailNotConfiguredError included, when mail isn't there.
export async function sendMail( ...args : Parameters<typeof Mail.sendMail> ) : Promise<void> {
	if ( !MODULES.mail )
		throw new Error( 'The mail module is not in this build.' )

	await ( await import( './index' ) ).sendMail( ...args )
}
