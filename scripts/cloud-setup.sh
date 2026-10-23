#!/bin/bash
# ―― » SessionStart hook ( .claude/settings.json ): what a cloud session needs before it works.
#      Cloud only ( CLAUDE_CODE_REMOTE ); a local machine is set up by the README. Never fails
#      the session: whatever it prints lands in Claude's context.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

# Dependencies, skipped while package.json and bun.lock are unchanged since the last install.
stamp=node_modules/.cloud-setup.sha256

if ! sha256sum --check --status "$stamp" 2>/dev/null; then
	rm -f "$stamp"

	if bun install --frozen-lockfile >/dev/null 2>&1; then
		sha256sum package.json bun.lock > "$stamp"
	else
		# Bun has known problems with the cloud's network proxy ( Claude Code docs ).
		echo 'cloud-setup: bun install failed. Run it yourself and read the error before going on.'
	fi
fi

# The code graph ( CLAUDE.md ): optional, and a minute to build, so in the background.
command -v graphify >/dev/null || pip install -q graphifyy >/dev/null 2>&1
command -v graphify >/dev/null && ( nohup graphify update . >/dev/null 2>&1 & )
exit 0
