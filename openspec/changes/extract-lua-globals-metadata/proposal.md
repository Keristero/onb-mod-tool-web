# Extract Lua Globals Metadata

## Why

The DartLangModTool contains a custom Lua interpreter with ONB-specific globals (functions like `load_texture`, `stream_music`, `requires_library`) and classes (like `Element.Fire`, `CardClass.Mega`) that mod developers use. Currently, these globals are not documented or exposed to the web tool, making it difficult to provide accurate syntax highlighting and autocomplete suggestions in the file browser.

## What Changes

- Create `/scripts/extract_globals.js` Node.js script to parse DartLangModTool source
- Extract Lua global definitions (functions, tables, variables)
- Extend metadata.json schema with `luaGlobals` field
- Add mise task `extract-globals` that runs during build
- Integrate script into GitHub Actions workflow
- Enhance file browser Lua syntax highlighting with ONB-specific color for globals
- Add CSS styling for `.hljs-onb-global` class (bright cyan/teal)

## Impact

- **Affected capabilities**: 
  - extraction-script (new)
  - build-integration (modified)
  - metadata-schema (modified)
  - syntax-highlighting (modified)
- **Affected files**:
  - `/scripts/extract_globals.js` (new)
  - `src/mise.toml` (modified - new task)
  - `.github/workflows/static.yml` (modified - workflow step)
  - `web/js/tabs/file-browser-tab.mjs` (modified - load metadata)
  - `web/js/utils/lua-globals.mjs` (new - highlighting logic)
  - `web/css/styles.css` (modified - new CSS class)
  - `web/versions/*/metadata.json` (modified schema)
- **Breaking changes**: None
- **Benefits**:
  - Automatic discovery of ONB-specific Lua APIs
  - Version-accurate global lists per analyzer
  - Enhanced developer experience with better syntax highlighting
  - Zero maintenance - adapts to DartLangModTool changes
