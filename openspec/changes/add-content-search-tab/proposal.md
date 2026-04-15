## Why

Mod creators frequently need to find specific strings across mods—API calls, asset references, error messages, or shared patterns—but currently must manually extract and search zip files. Adding a full-text search tab to the analyzer provides a GitHub/VS Code–style search directly over uploaded mods, enabling rapid discovery without leaving the tool.

## What Changes

- Add a new top-level **Search** tab alongside Results, File Browser, Statistics, and Dependencies.
- The Search tab has **Current File** and **Session** subtabs (matching the existing pattern).
  - **Current File**: searches only the currently selected mod.
  - **Session**: searches across all mods loaded in the session.
- A search input with submit triggers a string search across all text files inside the target mod zip(s).
- Results stream in progressively as files are scanned, grouped by mod.
- Each result shows the matching line with one line of context above and below.
- Clicking a mod name in the results selects that mod (same behavior as the mod list).
- A summary bar at the top shows: files searched, matches found, mods matched.
- Search is performed on the main thread using cached zip data (already loaded by other tabs), optimized with batched yielding to keep the UI responsive across 2000+ zips.

## Capabilities

### New Capabilities
- `content-search`: Full-text string search across mod zip file contents with streaming results, context display, and per-mod grouping.

### Modified Capabilities
<!-- No existing spec requirements change. The tab system and file processing lifecycle are extended, not altered. -->

## Impact

- **New files**: `src/web/js/tabs/search-tab.mjs` (tab module)
- **Modified files**: `src/web/index.html` (add tab button + content area), `src/web/js/main.mjs` (register tab, wire events), `src/web/css/styles.css` (search-specific styles)
- **Dependencies**: Uses JSZip (already included) for zip content access; no new external dependencies.
- **Performance**: Must handle 2000+ zips × ~5–20 files each without blocking the UI.
