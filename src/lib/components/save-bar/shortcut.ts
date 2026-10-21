// Ctrl+S / Cmd+S as "save what is on this bar". A predicate so it is testable
// without a browser — the interesting part is everything it must NOT match.
export function isSaveShortcut( event : KeyboardEvent ) : boolean {
	// `key`, not `code`: on Dvorak/AZERTY the shortcut belongs to the letter typed.
	if ( event.key !== 's' && event.key !== 'S' )
		return false

	// Exactly one of Ctrl / Cmd.
	if ( event.ctrlKey === event.metaKey )
		return false

	// Ctrl+Shift+S / Ctrl+Alt+S belong to other tools ( "save page as", IDE save-all ).
	return !event.shiftKey && !event.altKey
}
