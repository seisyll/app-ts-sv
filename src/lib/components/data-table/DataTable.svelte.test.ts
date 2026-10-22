import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import type { ColumnDef } from '@tanstack/svelte-table'
import { dateRangeFilter, facetedFilter, rowNumberColumn, selectColumn } from './columns'
import DataTable from './DataTable.svelte'
import type { DataTableFeatures } from './features'
import type { TableQuery } from './query'
import { TableSource } from './table-source.svelte'
import { goto, resetNavigation } from '#lib/test/app-navigation.js'
import { setPath } from '#lib/test/app-state.svelte.js'

vi.mock( '$app/state', () => import( '#lib/test/app-state.svelte.js' ) )
vi.mock( '$app/navigation', () => import( '#lib/test/app-navigation.js' ) )

type Person = { id : string, name : string, email : string, status : 'active' | 'trial' }

// 25 people: page 1 = 1–10. Names sort differently from ids so sorting is visible.
const PEOPLE : Person[] = Array.from( { length: 25 }, ( _, index ) => ( {
	id    : `p${ index + 1 }`,
	name  : `Person ${ String.fromCharCode( 90 - index ) }`,
	email : `user${ index + 1 }@acme.test`,
	status: index % 3 === 0 ? 'trial' : 'active'
} ) )

const COLUMNS : ColumnDef<DataTableFeatures, Person>[] = [
	selectColumn<Person>(),
	rowNumberColumn<Person>(),
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'status', header: 'Status', filterFn: facetedFilter },
	{ id: 'actions', header: '', cell: () => '…' }
]

const bodyRows = () => page.getByRole( 'row' ).elements().slice( 1 )
const firstName = () => bodyRows()[ 0 ]?.querySelectorAll( 'td' )[ 2 ]?.textContent?.trim()
const header = ( name : string ) => page.getByRole( 'button', { name, exact: true } )

describe( 'DataTable — in memory', () => {
	const mount = ( props : Record<string, unknown> = {} ) => render( DataTable<Person>, { data: PEOPLE, columns: COLUMNS, visibilityKey: null, ...props } )

	it( 'renders the first page', async() => {
		await mount()

		await expect.element( page.getByText( 'Person Z' ) ).toBeVisible()
		expect( bodyRows() ).toHaveLength( 10 )
		await expect.element( page.getByText( 'Page 1 of 3' ) ).toBeVisible()
	} )

	it( 'turns a string header into a sort toggle: asc, desc, off', async() => {
		await mount()

		await header( 'Name' ).click()
		await expect.poll( firstName ).toBe( 'Person B' )
		await expect.element( page.getByRole( 'columnheader', { name: 'Name' } ) ).toHaveAttribute( 'aria-sort', 'ascending' )

		await header( 'Name' ).click()
		await expect.poll( firstName ).toBe( 'Person Z' )
		await expect.element( page.getByRole( 'columnheader', { name: 'Name' } ) ).toHaveAttribute( 'aria-sort', 'descending' )
	} )

	it( 'numbers rows by position across pages', async() => {
		await mount()

		await page.getByRole( 'button', { name: 'Next page' } ).click()
		await expect.poll( () => bodyRows()[ 0 ].querySelectorAll( 'td' )[ 1 ].textContent?.trim() ).toBe( '11' )
	} )

	it( 'searches, and re-filters when only the search scope changes', async() => {
		await mount( { search: { columns: [ { value: 'name', label: 'Name' }, { value: 'email', label: 'Email' } ] } } )

		await page.getByRole( 'searchbox', { name: 'Search' } ).fill( 'person z' )
		await expect.poll( () => bodyRows().length ).toBe( 1 )

		// Scope → Email: "person z" is in no email, so the row must go without retyping.
		await page.getByRole( 'combobox', { name: 'Search' } ).click()
		await page.getByRole( 'option', { name: 'Email' } ).click()
		await expect.element( page.getByText( 'No results.' ) ).toBeVisible()
	} )

	it( 'filters by facet, returns to page 1, and Reset clears it', async() => {
		await mount( { filters: [ { columnId: 'status', title: 'Status', options: [ { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' } ] } ] } )

		await page.getByRole( 'button', { name: 'Next page' } ).click()
		// The toolbar's facet trigger, not the Status column's sort button after it.
		await page.getByRole( 'button', { name: 'Status' } ).first().click()
		await page.getByRole( 'option', { name: 'Trial' } ).click()
		await userEvent.keyboard( '{Escape}' )

		await expect.element( page.getByText( 'Total: 9' ) ).toBeVisible()
		await expect.element( page.getByText( 'Page 1 of 1' ) ).toBeVisible()

		await page.getByRole( 'button', { name: 'Reset' } ).click()
		await expect.element( page.getByText( 'Total: 25' ) ).toBeVisible()
	} )

	it( 'offers only data columns in the Columns menu', async() => {
		await mount()

		await page.getByRole( 'button', { name: 'Columns' } ).click()
		const items = page.getByRole( 'menuitemcheckbox' ).elements().map( ( item ) => item.textContent?.trim() )

		expect( items ).toEqual( [ 'Name', 'Email', 'Status' ] )
	} )

	it( 'runs a bulk action on the selected rows, then clears the selection', async() => {
		const run = vi.fn()

		await mount( { enableSelection: true, bulkActions: [ { id: 'archive', label: 'Archive', run } ] } )

		await page.getByRole( 'checkbox', { name: 'Select row' } ).nth( 0 ).click()
		await page.getByRole( 'checkbox', { name: 'Select row' } ).nth( 1 ).click()
		await expect.element( page.getByRole( 'region', { name: 'Bulk actions' } ) ).toMatchTextContent( '2 selected' )

		await page.getByRole( 'button', { name: 'Archive' } ).click()

		expect( run ).toHaveBeenCalledWith( [ PEOPLE[ 0 ], PEOPLE[ 1 ] ] )
		await expect.element( page.getByRole( 'region', { name: 'Bulk actions' } ) ).not.toBeInTheDocument()
	} )
} )

describe( 'DataTable — date range', () => {
	it( 'filters to the picked days, and Reset clears the calendar too', async() => {
		// Dated this month, at noon UTC: the calendar opens on today's month.
		const now = new Date()
		const month = `${ now.getUTCFullYear() }-${ String( now.getUTCMonth() + 1 ).padStart( 2, '0' ) }`
		const rows = [ 1, 2, 3, 10, 11, 20 ].map( ( day ) => ( {
			id       : `r${ day }`,
			name     : `Row ${ day }`,
			createdAt: `${ month }-${ String( day ).padStart( 2, '0' ) }T12:00:00Z`
		} ) )
		const columns : ColumnDef<DataTableFeatures, typeof rows[number]>[] = [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'createdAt', header: 'Created', filterFn: dateRangeFilter }
		]
		const dayCell = ( day : string ) => document.querySelector<HTMLElement>( `[data-value="${ month }-${ day }"]:not([data-outside-month])` )!

		await render( DataTable<typeof rows[number]>, { data: rows, columns, dateRange: { columnId: 'createdAt' }, visibilityKey: null } )

		await page.getByRole( 'button', { name: 'Date', exact: true } ).click()
		await userEvent.click( dayCell( '01' ) )
		await userEvent.click( dayCell( '03' ) )
		await userEvent.keyboard( '{Escape}' )

		await expect.element( page.getByText( 'Total: 3' ) ).toBeVisible()
		await expect.element( page.getByRole( 'button', { name: 'Date', exact: true } ) ).not.toBeInTheDocument()

		await page.getByRole( 'button', { name: 'Reset' } ).click()
		await expect.element( page.getByText( 'Total: 6' ) ).toBeVisible()

		// B kept showing the old range here after Reset.
		await page.getByRole( 'button', { name: 'Date', exact: true } ).click()
		expect( document.querySelectorAll( '[data-value][data-selected]' ) ).toHaveLength( 0 )
	} )
} )

describe( 'DataTable — server mode', () => {
	function mountServer( props : Record<string, unknown> = {} ) {
		const onQuery = vi.fn<( query : TableQuery ) => void>()
		const result = render( DataTable<Person>, {
			data         : PEOPLE.slice( 0, 10 ),
			rowCount     : 25,
			columns      : COLUMNS,
			visibilityKey: null,
			onQuery,
			...props
		} )

		return { onQuery, result, last: () => onQuery.mock.lastCall?.[ 0 ] }
	}

	it( 'reports sort as a query instead of sorting the page', async() => {
		const { last } = mountServer()

		await header( 'Name' ).click()

		expect( last() ).toMatchObject( { sort: 'name', dir: 'asc', pageIndex: 0, immediate: true } )
		expect( firstName() ).toBe( 'Person Z' )
	} )

	it( 'reports paging immediately and typing as debounced', async() => {
		const { last } = mountServer( { search: {} } )

		await page.getByRole( 'button', { name: 'Next page' } ).click()
		expect( last() ).toMatchObject( { pageIndex: 1, immediate: true } )

		await page.getByRole( 'searchbox', { name: 'Search' } ).fill( 'ada' )
		expect( last() ).toMatchObject( { search: 'ada', pageIndex: 0, immediate: false } )
	} )

	it( 'clears the selection when the query changes', async() => {
		mountServer( { enableSelection: true } )

		await page.getByRole( 'checkbox', { name: 'Select row' } ).nth( 0 ).click()
		await expect.element( page.getByText( '1 of 25 selected' ) ).toBeVisible()

		await page.getByRole( 'button', { name: 'Next page' } ).click()
		await expect.element( page.getByText( '0 of 25 selected' ) ).toBeVisible()
	} )

	it( 'shows loading while a TableSource fetches, then the new page', async() => {
		let answer : ( response : Response ) => void = () => {}
		const fetch = vi.fn( () => new Promise<Response>( ( resolve ) => ( answer = resolve ) ) )
		const source = new TableSource<Person>( { path: '/api/people', initial: { rows: PEOPLE.slice( 0, 10 ), total: 25 }, fetch } )

		await render( DataTable<Person>, { source, columns: COLUMNS, visibilityKey: null } )
		await page.getByRole( 'button', { name: 'Next page' } ).click()

		await expect.element( page.getByText( 'Loading' ) ).toBeVisible()
		answer( new Response( JSON.stringify( { rows: PEOPLE.slice( 10, 20 ), total: 25 } ) ) )
		await expect.element( page.getByText( PEOPLE[ 10 ].name ) ).toBeVisible()
		await expect.element( page.getByText( 'Loading' ) ).not.toBeInTheDocument()
	} )

	it( 'says a failed read is stale, and Retry re-runs it', async() => {
		const fetch = vi.fn( async() => new Response( JSON.stringify( { message: 'Server unavailable' } ), { status: 503 } ) )
		const source = new TableSource<Person>( { path: '/api/people', initial: { rows: PEOPLE.slice( 0, 10 ), total: 25 }, fetch } )

		await render( DataTable<Person>, { source, columns: COLUMNS, visibilityKey: null } )
		await page.getByRole( 'button', { name: 'Next page' } ).click()

		const alert = page.getByRole( 'alert' )

		await expect.element( alert ).toMatchTextContent( 'Server unavailable' )
		await expect.element( alert ).toMatchTextContent( 'The list below hasn\'t been refreshed.' )

		await alert.getByRole( 'button', { name: 'Retry' } ).click()
		expect( fetch ).toHaveBeenCalledTimes( 2 )
	} )
} )

describe( 'DataTable — URL state', () => {
	const STATUS = [ { columnId: 'status', title: 'Status', options: [ { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' } ] } ]
	const written = () => new URL( String( goto.mock.lastCall?.[ 0 ] ), 'http://localhost' ).searchParams

	it( 'starts from the address: page, size, sort and a facet', async() => {
		setPath( '/people?page=2&size=5&sort=name&status=trial&utm=x' )
		await render( DataTable<Person>, { data: PEOPLE, columns: COLUMNS, filters: STATUS, visibilityKey: null, syncUrl: true } )

		// 9 trial people, 5 a page, by name: page 2 holds the last 4.
		await expect.element( page.getByText( 'Page 2 of 2' ) ).toBeVisible()
		await expect.element( page.getByRole( 'columnheader', { name: 'Name' } ) ).toHaveAttribute( 'aria-sort', 'ascending' )
		expect( bodyRows() ).toHaveLength( 4 )
		setPath( '/' )
	} )

	it( 'writes changes back with a shallow goto that replaces the entry', async() => {
		resetNavigation()
		setPath( '/' )
		await render( DataTable<Person>, { data: PEOPLE, columns: COLUMNS, visibilityKey: null, syncUrl: true } )

		await page.getByRole( 'button', { name: 'Next page' } ).click()
		expect( written().get( 'page' ) ).toBe( '2' )
		expect( goto.mock.lastCall?.[ 1 ] ).toMatchObject( { shallow: true, replace: true } )

		await header( 'Email' ).click()
		// A new sort starts again from page 1, which is the default and so left out.
		expect( written().get( 'page' ) ).toBeNull()
		expect( written().get( 'sort' ) ).toBe( 'email' )
	} )

	it( 'tells a TableSource the query its first page was loaded with', async() => {
		setPath( '/people?q=ada&page=3' )
		const fetch = vi.fn()
		const source = new TableSource<Person>( { path: '/api/people', initial: { rows: PEOPLE.slice( 20 ), total: 25 }, fetch } )

		await render( DataTable<Person>, { source, columns: COLUMNS, search: {}, visibilityKey: null, syncUrl: true } )

		await expect.element( page.getByRole( 'searchbox', { name: 'Search' } ) ).toHaveValue( 'ada' )
		expect( source.query ).toMatchObject( { search: 'ada', pageIndex: 2 } )
		expect( fetch ).not.toHaveBeenCalled()
		setPath( '/' )
	} )
} )
