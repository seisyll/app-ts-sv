<script lang="ts">
	import type { Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { cubicOut } from 'svelte/easing'
	import { prefersReducedMotion } from 'svelte/motion'
	import { beforeNavigate, goto } from '$app/navigation'
	import CheckCheckIcon from '@lucide/svelte/icons/check-check'
	import Undo2Icon from '@lucide/svelte/icons/undo-2'
	import * as AlertDialog from '$lib/components/ui/alert-dialog'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import SaveBarAction from './SaveBarAction.svelte'
	import { isSaveShortcut } from './shortcut'

	/* ―― » Floating, bottom-anchored action bar for edit-then-commit pages.
	        Visibility modes:
	          • Always on        — omit `show` and `dirty`.
	          • Reveal on change — `show={dirty}`.
	          • Always on, gated — `dirty={dirty}`: bar stays, message/discard appear and
	                               Save unlocks only while dirty.
	        Guards navigation while dirty, Ctrl/Cmd+S clicks Save, the status message is
	        announced to screen readers at every width. */
	let {
		show,
		dirty,
		saving = false,
		disabled = false,
		message = m.savebar_unsaved(),
		saveLabel = m.savebar_save(),
		saveType = 'button',
		onsave,
		ondiscard,
		discardLabel = m.savebar_discard(),
		confirmDiscard = true,
		guardNavigation = true,
		discardTitle = m.savebar_discard_title(),
		discardDescription = m.savebar_discard_desc(),
		discardConfirmLabel = m.savebar_discard_confirm(),
		leaveTitle = m.savebar_leave_title(),
		leaveDescription = m.savebar_leave_desc(),
		leaveConfirmLabel = m.savebar_leave_confirm(),
		cancelLabel = m.savebar_cancel(),
		children,
		class: className
	} : {
		// Dirty flag that reveals the bar. Omit for an always-on bar.
		show ?               : boolean
		// Dirty gate for an always-on bar. Omit for the `show`-driven behaviour.
		dirty ?              : boolean
		// In flight: spinner on Save, Discard/Save locked, navigation not guarded.
		// Page-specific actions ( children ) are the caller's to disable.
		saving ?             : boolean
		// Block saving ( e.g. invalid form ). Does not affect other actions.
		disabled ?           : boolean
		message ?            : string
		saveLabel ?          : string
		// 'submit' submits the enclosing <form> — put the bar INSIDE the form.
		saveType ?           : 'button' | 'submit'
		onsave ?             : () => void
		// The undo. Rendered only when a handler is given.
		ondiscard ?          : () => void
		discardLabel ?       : string
		// Discard sits one target away from Save; confirm by default.
		confirmDiscard ?     : boolean
		// Only takes effect when the caller reports dirtiness ( `show` or `dirty` ).
		guardNavigation ?    : boolean
		discardTitle ?       : string
		discardDescription ? : string
		discardConfirmLabel ?: string
		leaveTitle ?         : string
		leaveDescription ?   : string
		leaveConfirmLabel ?  : string
		cancelLabel ?        : string
		// Page-specific extra actions ( <SaveBarAction> ), placed before Discard/Save.
		children ?           : Snippet
		class ?              : string
	} = $props()

	const visible = $derived( show ?? true )
	const isDirty = $derived( dirty ?? show ?? true )

	// An always-on bar with neither prop reads as permanently dirty; guarding on that
	// would trap the user on the page. So the guard needs evidence of dirty tracking.
	const guarded = $derived( guardNavigation && ( dirty !== undefined || show !== undefined ) )
	const canSave = $derived( visible && isDirty && !saving && !disabled )

	let confirmOpen = $state( false )
	let intent = $state<'discard' | 'leave'>( 'discard' )
	let saveElement = $state<HTMLButtonElement | null>( null )

	// The navigation the guard cancelled. `delta` is set for Back/Forward ( popstate ).
	let pending : { url : URL, delta ?: number } | null = null
	// Set while replaying a confirmed navigation so the guard lets that one through.
	let leaving = false

	function requestDiscard() : void {
		if ( !confirmDiscard ) {
			ondiscard?.()

			return
		}

		intent = 'discard'
		confirmOpen = true
	}

	function proceed() : void {
		confirmOpen = false

		if ( intent === 'discard' ) {
			ondiscard?.()

			return
		}

		const next = pending

		pending = null

		if ( !next )
			return

		leaving = true

		// Replay as the same kind of move: Back/Forward re-walks history ( `goto` would
		// push a new entry and turn a Back into a forward step ); everything else pushes.
		if ( next.delta )
			history.go( next.delta )
		else
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- replays a URL SvelteKit already resolved ( base included )
			void goto( next.url )
	}

	// Registered unconditionally ( must run during init ); decides per navigation.
	beforeNavigate( ( navigation ) => {
		if ( leaving ) {
			leaving = false

			return
		}

		if ( !guarded || !isDirty || saving )
			return

		navigation.cancel()

		// Leaving the document ( tab close, reload, external link ): cancel() hands over
		// to the browser's own unload prompt — the only thing that can gate an unload.
		if ( navigation.willUnload || !navigation.to )
			return

		pending = {
			url  : navigation.to.url,
			delta: navigation.type === 'popstate' ? navigation.delta : undefined
		}
		intent = 'leave'
		confirmOpen = true
	} )

	function onkeydown( event : KeyboardEvent ) : void {
		if ( !isSaveShortcut( event ) || !canSave )
			return

		event.preventDefault()

		// Click the real button: with saveType='submit' only a genuine click submits.
		saveElement?.click()
	}

	const motion = $derived( prefersReducedMotion.current
		? { y: 0, duration: 0 }
		: { y: 16, duration: 220 } )

	const dialog = $derived( intent === 'discard'
		? { title: discardTitle, description: discardDescription, action: discardConfirmLabel }
		: { title: leaveTitle, description: leaveDescription, action: leaveConfirmLabel } )
</script>

<svelte:window {onkeydown} />

{#if visible}
	<!-- Click-through wrapper: only the bar itself captures pointer events. -->
	<div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
		<div
			transition:fly={{ ...motion, easing: cubicOut }}
			class={cn(
				'border-border bg-popover text-popover-foreground pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border p-2 shadow-lg',
				message && isDirty && 'sm:pl-5',
				className
			)}
		>
			<Tooltip.Provider delayDuration={150}>
				{#if message && isDirty}
					<!-- sr-only below sm ( buttons are icon-only there ), visible above. -->
					<span role="status" aria-live="polite" class="text-muted-foreground sr-only truncate text-sm sm:not-sr-only sm:block">
						{message}
					</span>
					<span class="bg-border mx-1 hidden h-5 w-px sm:block" aria-hidden="true"></span>
				{/if}

				{@render children?.()}

				{#if ondiscard && isDirty}
					<SaveBarAction
						variant="ghost"
						icon={Undo2Icon}
						label={discardLabel}
						disabled={saving}
						onclick={requestDiscard}
						class="text-muted-foreground hover:text-foreground"
					/>
				{/if}

				<SaveBarAction
					bind:element={saveElement}
					variant="default"
					icon={CheckCheckIcon}
					label={saveLabel}
					type={saveType}
					loading={saving}
					disabled={disabled || !isDirty}
					onclick={onsave}
				/>
			</Tooltip.Provider>
		</div>
	</div>
{/if}

<!-- Outside the {#if}: discarding hides the bar, and the dialog must outlive it. -->
<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{dialog.title}</AlertDialog.Title>
			<AlertDialog.Description>{dialog.description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{cancelLabel}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={proceed}>{dialog.action}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
