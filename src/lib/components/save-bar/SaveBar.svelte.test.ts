import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import { attemptNavigation, goto, resetNavigation } from '#lib/test/app-navigation.js'
import SaveBar from './SaveBar.svelte'

// No SvelteKit runtime in a component test: route `$app/*` to the test kit.
vi.mock( '$app/navigation', () => import( '#lib/test/app-navigation.js' ) )
vi.mock( '$app/state', () => import( '#lib/test/app-state.svelte.js' ) )

const save = () => page.getByRole( 'button', { name: 'Save' } )
const discard = () => page.getByRole( 'button', { name: 'Discard' } )
const dialog = () => page.getByRole( 'alertdialog' )

describe( 'SaveBar', () => {
	afterEach( () => {
		resetNavigation()
		vi.restoreAllMocks()
	} )

	describe( 'visibility', () => {
		it( 'reveal-on-change: hidden while clean, shown with its message once dirty', async() => {
			const screen = await render( SaveBar, { show: false } )

			await expect.element( save() ).not.toBeInTheDocument()

			await screen.rerender( { show: true } )
			await expect.element( save() ).toBeEnabled()
			await expect.element( page.getByRole( 'status' ) ).toHaveTextContent( 'You have unsaved changes' )
		} )

		it( 'gated: always visible, Save locked and no Discard while clean', async() => {
			const screen = await render( SaveBar, { dirty: false, ondiscard: () => {} } )

			await expect.element( save() ).toBeDisabled()
			await expect.element( discard() ).not.toBeInTheDocument()

			await screen.rerender( { dirty: true } )
			await expect.element( save() ).toBeEnabled()
			await expect.element( discard() ).toBeVisible()
		} )

		it( 'disabled locks Save but keeps Discard usable', async() => {
			await render( SaveBar, { show: true, disabled: true, ondiscard: () => {} } )

			await expect.element( save() ).toBeDisabled()
			await expect.element( discard() ).toBeEnabled()
		} )
	} )

	describe( 'saving', () => {
		it( 'Ctrl+S clicks Save', async() => {
			const onsave = vi.fn()

			await render( SaveBar, { show: true, onsave } )
			await userEvent.keyboard( '{Control>}s{/Control}' )

			expect( onsave ).toHaveBeenCalledOnce()
		} )

		it( 'Ctrl+S does nothing while saving is blocked', async() => {
			const onsave = vi.fn()

			await render( SaveBar, { show: true, disabled: true, onsave } )
			await userEvent.keyboard( '{Control>}s{/Control}' )

			expect( onsave ).not.toHaveBeenCalled()
		} )
	} )

	describe( 'discard', () => {
		it( 'asks first, and only discards on confirm', async() => {
			const ondiscard = vi.fn()

			await render( SaveBar, { show: true, ondiscard } )

			await discard().click()
			await expect.element( dialog() ).toMatchTextContent( 'Discard changes?' )
			await dialog().getByRole( 'button', { name: 'Keep editing' } ).click()
			expect( ondiscard ).not.toHaveBeenCalled()

			await discard().click()
			await dialog().getByRole( 'button', { name: 'Discard changes' } ).click()
			expect( ondiscard ).toHaveBeenCalledOnce()
		} )

		it( 'confirmDiscard={false} discards at once', async() => {
			const ondiscard = vi.fn()

			await render( SaveBar, { show: true, ondiscard, confirmDiscard: false } )
			await discard().click()

			expect( ondiscard ).toHaveBeenCalledOnce()
			await expect.element( dialog() ).not.toBeInTheDocument()
		} )
	} )

	describe( 'navigation guard', () => {
		it( 'stops a link while dirty and replays it with goto on "Leave page"', async() => {
			await render( SaveBar, { show: true } )

			expect( attemptNavigation( '/elsewhere' ) ).toBe( true )
			await expect.element( dialog() ).toMatchTextContent( 'Leave this page?' )

			await dialog().getByRole( 'button', { name: 'Leave page' } ).click()
			expect( goto ).toHaveBeenCalledWith( new URL( 'http://localhost/elsewhere' ) )
		} )

		it( 'lets the replayed navigation through instead of asking twice', async() => {
			await render( SaveBar, { show: true } )

			attemptNavigation( '/elsewhere' )
			await dialog().getByRole( 'button', { name: 'Leave page' } ).click()

			expect( attemptNavigation( '/elsewhere' ) ).toBe( false )
		} )

		it( 'replays Back with history.go, not a forward goto', async() => {
			const go = vi.spyOn( history, 'go' ).mockImplementation( () => {} )

			await render( SaveBar, { show: true } )

			attemptNavigation( '/previous', { type: 'popstate', delta: -1 } )
			await dialog().getByRole( 'button', { name: 'Leave page' } ).click()

			expect( go ).toHaveBeenCalledWith( -1 )
			expect( goto ).not.toHaveBeenCalled()
		} )

		it( '"Keep editing" stays put', async() => {
			await render( SaveBar, { show: true } )

			attemptNavigation( '/elsewhere' )
			await dialog().getByRole( 'button', { name: 'Keep editing' } ).click()

			expect( goto ).not.toHaveBeenCalled()
		} )

		it( 'hands a document unload to the browser prompt, without its own dialog', async() => {
			await render( SaveBar, { show: true } )

			expect( attemptNavigation( 'https://example.com', { willUnload: true } ) ).toBe( true )
			await expect.element( dialog() ).not.toBeInTheDocument()
		} )

		it( 'does not guard when clean, while saving, or when it cannot know', async() => {
			const screen = await render( SaveBar, { show: false } )

			expect( attemptNavigation( '/elsewhere' ) ).toBe( false )

			await screen.rerender( { show: true, saving: true } )
			expect( attemptNavigation( '/elsewhere' ) ).toBe( false )

			// Always-on bar with neither `show` nor `dirty`: reads dirty forever, so no guard.
			await screen.unmount()
			await render( SaveBar, {} )
			expect( attemptNavigation( '/elsewhere' ) ).toBe( false )
		} )
	} )
} )
