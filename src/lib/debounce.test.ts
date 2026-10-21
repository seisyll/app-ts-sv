import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from './debounce'

describe( 'debounce', () => {
	beforeEach( () => vi.useFakeTimers() )
	afterEach( () => vi.useRealTimers() )

	it( 'calls once, with the last arguments, after the quiet period', () => {
		const fn = vi.fn()
		const run = debounce( 300, fn )

		run( 'a' )
		run( 'ab' )
		vi.advanceTimersByTime( 299 )
		expect( fn ).not.toHaveBeenCalled()
		vi.advanceTimersByTime( 1 )
		expect( fn ).toHaveBeenCalledOnce()
		expect( fn ).toHaveBeenCalledWith( 'ab' )
	} )

	it( 'cancel drops the pending call', () => {
		const fn = vi.fn()
		const run = debounce( 300, fn )

		run( 'a' )
		run.cancel()
		vi.advanceTimersByTime( 1000 )
		expect( fn ).not.toHaveBeenCalled()
	} )
} )
