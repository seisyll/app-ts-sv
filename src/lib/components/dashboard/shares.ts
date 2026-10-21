/* ―― » Whole percentages that add up to 100, by largest remainder ( billing-app's ). Rounding
        each share on its own prints 33 + 33 + 33 on a three-way tie — a bar that claims 99%
        of itself — and a headline rate read from here can never disagree with its bar. */
export function shares( values : number[] ) : number[] {
	const total = values.reduce( ( sum, value ) => sum + value, 0 )

	if ( total === 0 )
		return values.map( () => 0 )

	const exact = values.map( ( value ) => ( value / total ) * 100 )
	const floors = exact.map( Math.floor )
	let left = 100 - floors.reduce( ( sum, value ) => sum + value, 0 )

	for ( const { index } of exact.map( ( value, index ) => ( { index, rest: value - floors[ index ] } ) ).sort( ( a, b ) => b.rest - a.rest ) ) {
		if ( left === 0 )
			break

		floors[ index ]++
		left--
	}

	return floors
}
