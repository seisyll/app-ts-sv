/* ―― » Prisma errors, narrowed by their code ( billing-app's prisma-error.ts ). Structural —
        a `code` on whatever was thrown — rather than instanceof, so a test can throw a plain
        object and nothing here imports Prisma's runtime. */
const codeOf = ( error : unknown ) => ( error as { code ?: unknown } | null )?.code

// P2002: a unique index refused the row. Tenant-scoped unique indexes make that "taken in
// this workspace", never a collision with another one — answer 409.
export const isUniqueViolation = ( error : unknown ) => codeOf( error ) === 'P2002'

// P2003: the row points at a parent that isn't there. Under RLS that includes another
// workspace's row, which this one cannot see — the caller's bad reference, a 400.
export const isForeignKeyViolation = ( error : unknown ) => codeOf( error ) === 'P2003'

/* ―― » A delete refused by ON DELETE RESTRICT: the row is still referenced. NOT P2003 —
        Postgres raises 23001 here, which Prisma 7's pg adapter surfaces as P2039, a code
        Prisma doesn't document and a driver upgrade could renumber; Postgres's own text
        stays put, so both are matched. Catch this instead of counting the children first:
        a check and then a delete leaves a window, the constraint leaves none. */
export const isRestrictViolation = ( error : unknown ) => codeOf( error ) === 'P2039'
	|| String( ( error as { message ?: unknown } | null )?.message ).includes( 'violates RESTRICT setting' )

/* ―― » Run a write again when it lost a race on a unique index — the next invoice number,
        read from the last one by two requests at once. Bounded: a real duplicate is still
        one five tries later, and reaches the caller as P2002. Jittered: losers that retry in
        the same instant collide again ( billing-app measured it at four concurrent writers ).
        Wrap the whole tenantTransaction, never a statement inside one — Postgres aborts the
        transaction at the first error. Not for a collision that stays, such as a name a
        person typed: retrying only repeats the same answer. */
export async function withUniqueRetry<T>( run : () => Promise<T>, attempts = 5 ) : Promise<T> {
	for ( let attempt = 1; ; attempt++ ) {
		try {
			return await run()
		} catch ( caught ) {
			if ( attempt >= attempts || !isUniqueViolation( caught ) )
				throw caught

			await new Promise( ( resolve ) => setTimeout( resolve, Math.random() * 8 * attempt ) )
		}
	}
}
