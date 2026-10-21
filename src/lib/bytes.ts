/* ―― » A size as people write it — "500M", "5G", "1.5 GB", "2048" ( bytes ) — in bytes, or null
        for blank or nonsense. Binary units, like formatBytes below. Plain on purpose:
        scripts import it too. */
const UNITS : Record<string, number> = { '': 1, b: 1, k: 1024, kb: 1024, m: 1024 ** 2, mb: 1024 ** 2, g: 1024 ** 3, gb: 1024 ** 3, t: 1024 ** 4, tb: 1024 ** 4 }

export function parseBytes( text : string | null | undefined ) : number | null {
	const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec( text ?? '' )
	const unit = match && UNITS[ match[ 2 ].toLowerCase() ]

	return match && unit ? Math.round( Number( match[ 1 ] ) * unit ) : null
}

// "1.4 MB". Binary units, one decimal past bytes.
export function formatBytes( bytes : number ) : string {
	const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ]
	const step = bytes > 0 ? Math.min( units.length - 1, Math.floor( Math.log( bytes ) / Math.log( 1024 ) ) ) : 0

	return `${ ( bytes / 1024 ** step ).toFixed( step ? 1 : 0 ) } ${ units[ step ] }`
}
