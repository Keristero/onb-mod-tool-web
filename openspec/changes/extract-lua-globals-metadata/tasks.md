# Implementation Tasks

## Phase 1: Script Development
- [ ] Create `/scripts` directory in repository root
- [ ] Create `/scripts/extract_globals.js` Node.js script
  - [ ] Implement file reading for bindings directory using fs module
  - [ ] Extract function globals from `LuaFuncBuilder.create()` patterns using regex
  - [ ] Extract table globals from `LuaObject.table()` patterns using regex
  - [ ] Extract Dart enum classes and add as tables (Elements, CardClass, Rank, etc.)
  - [ ] Extract variable globals from `LuaObject.variable()` patterns using regex
  - [ ] Extract no-semantics globals from `LuaObject.noSemantics()` patterns using regex
- [ ] Define JSON output schema with categories:
  - [ ] `functions`: Array of function names
  - [ ] `tables`: Object mapping table names to their fields (includes enums)
  - [ ] `variables`: Array of variable names
- [ ] Add error handling and validation to script
- [ ] Test script locally against DartLangModTool source

## Phase 2: Build Integration
- [ ] Add `extract-globals` mise task to `src/mise.toml`
  - [ ] Ensure Node.js is available (usually pre-installed)
  - [ ] Set working directory to repository root
  - [ ] Define output path to current version metadata.json
- [ ] Update `build:web` mise task to depend on `extract-globals`
- [ ] Modify metadata.json schema to include `luaGlobals` field
- [ ] Update GitHub Actions workflow (`.github/workflows/static.yml`)
  - [ ] Ensure extract-globals runs before WASM compilation
  - [ ] Verify metadata.json includes globals data

## Phase 3: Frontend Integration
- [ ] Update `web/js/tabs/file-browser-tab.mjs`
  - [ ] Load metadata.json for selected analyzer version
  - [ ] Parse `luaGlobals` field
  - [ ] Build lookup set for O(1) global checking
- [ ] Extend Lua syntax highlighting in file browser
  - [ ] Add custom CSS class for ONB globals (e.g., `.hljs-onb-global`)
  - [ ] Define distinct color (suggest: bright cyan/teal)
  - [ ] Apply highlighting after highlight.js processing
  - [ ] Handle table member access (e.g., `Element.Fire`)
- [ ] Update `web/css/styles.css` with new color definitions
- [ ] Test with sample Lua files containing various global types

## Phase 4: Documentation & Testing
- [ ] Add `/scripts/README.md` documenting script usage and Node.js requirements
- [ ] Update main README.md with new feature
- [ ] Create test fixtures with example Lua files
- [ ] Manual test: Verify all global categories (functions, tables, variables) are highlighted
- [ ] Manual test: Verify highlighting works across analyzer versions
- [ ] Manual test: Verify build workflow succeeds end-to-end

## Validation Checklist
- [ ] Script runs without errors on current DartLangModTool
- [ ] All known globals are extracted (spot-check against source)
- [ ] metadata.json validates against schema
- [ ] File browser loads and displays enhanced highlighting
- [ ] No breaking changes to existing functionality
- [ ] Build time increase is negligible (<10 seconds)
