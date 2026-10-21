// Trailing-edge debounce with `cancel()` — a component that unmounts mid-delay must be
// able to drop the pending call instead of firing it into a destroyed scope.
export type Debounced<A extends unknown[]> = {
	( ...args : A ) : void
	cancel : () => void
}

export function debounce<A extends unknown[]>( delayMs : number, fn : ( ...args : A ) => void ) : Debounced<A> {
	let timer : ReturnType<typeof setTimeout> | undefined

	const run = ( ...args : A ) : void => {
		clearTimeout( timer )
		timer = setTimeout( () => {
			timer = undefined
			fn( ...args )
		}, delayMs )
	}

	run.cancel = () : void => {
		clearTimeout( timer )
		timer = undefined
	}

	return run
}
