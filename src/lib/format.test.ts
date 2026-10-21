import { describe, expect, it } from 'vitest'
import { maskEmail, maskName, maskPhone, slugify } from './format'

describe( 'slugify', () => {
	it( 'keeps letters, drops accents and everything else', () => {
		expect( slugify( '  Café Déjà Vu! ' ) ).toBe( 'cafe-deja-vu' )
		expect( slugify( 'Q3 report — final_v2' ) ).toBe( 'q3-report-final-v2' )
		expect( slugify( '!!!' ) ).toBe( '' )
	} )
} )

describe( 'masks', () => {
	it( 'hides all but a hint, behind a run that never tells the length', () => {
		expect( maskPhone( '081234567890' ) ).toBe( '••••890' )
		expect( maskEmail( 'john.doe@mail.com' ) ).toBe( 'j••••@mail.com' )
		expect( maskEmail( 'a@mail.com' ) ).toBe( maskEmail( 'abcdefgh@mail.com' ) )
		expect( maskEmail( 'nodomain' ) ).toBe( 'n••••' )
		expect( maskName( ' Budi  Santoso ' ) ).toBe( 'B•••• S••••' )
	} )

	it( 'gives nothing for nothing', () => {
		for ( const mask of [ maskPhone, maskEmail, maskName ] )
			expect( [ mask( null ), mask( undefined ), mask( '  ' ) ] ).toEqual( [ '', '', '' ] )
	} )
} )
