# Codex Command Constraints
- DO NOT use shell tools (`perl`, `sed`, `awk`) to perform inline search-and-replace text modifications. This is highly token-inefficient.
- DO NOT inject escaped regex strings into bash commands.
- ALWAYS write file updates using structural patching hooks or standard file system APIs.
- If an edit is too large, use `git diff` format or rewrite the target components outright rather than issuing escaped multi-line shell string replaces.
