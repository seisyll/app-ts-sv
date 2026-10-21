// Edit-then-commit state for SaveBar pages: `value` is the working copy ( bind
// inputs to it ), `dirty` compares it with the last committed snapshot.
// ponytail: JSON comparison — key order matters and Date/Map/Set aren't preserved;
// swap in a structural deep-equal if a form ever holds those.
export class Draft<T> {
	value = $state() as T
	#saved = $state( '' )

	constructor( initial : T ) {
		this.#saved = JSON.stringify( initial )
		this.value = JSON.parse( this.#saved )
	}

	get dirty() : boolean {
		return JSON.stringify( this.value ) !== this.#saved
	}

	// Call after a successful save: the current value becomes the new baseline.
	commit() : void {
		this.#saved = JSON.stringify( this.value )
	}

	// Discard: back to the last committed snapshot.
	reset() : void {
		this.value = JSON.parse( this.#saved )
	}
}
