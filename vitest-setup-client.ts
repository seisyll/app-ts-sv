/// <reference types="vitest/browser" />
/// <reference types="@vitest/browser-playwright" />
import { afterEach } from 'vitest'

// bits-ui registers overlays ( dialog, popover, select ) 1ms after mount. A test that
// unmounts sooner leaves dead entries behind and floods the log with `derived_inert`.
// A harness race, not an app bug — so wait it out rather than silence the warning.
afterEach( () => new Promise( ( resolve ) => setTimeout( resolve, 2 ) ) )
