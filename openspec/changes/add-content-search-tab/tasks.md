## 1. HTML & CSS scaffold

- [x] 1.1 Add Search tab button to the main tab bar in `index.html`
- [x] 1.2 Add Search tab content area with Current File / Session subtabs, search input, summary bar, and results container in `index.html`
- [x] 1.3 Add CSS styles for the search input, summary bar, result groups, context lines, and match highlighting in `styles.css`

## 2. Search tab module

- [x] 2.1 Create `src/web/js/tabs/search-tab.mjs` extending `BaseTab` with `init`, `onFileProcessed`, `setCurrentMod`, `render`, `clear` lifecycle methods
- [x] 2.2 Implement search input handling (submit on button click and Enter key, reject empty queries)
- [x] 2.3 Implement text-file extension filtering (whitelist `.lua`, `.toml`, `.txt`, `.json`, `.xml`, `.md`, `.cfg`, `.ini`, `.csv`, `.tsv`, and no-extension files)
- [x] 2.4 Implement the core search loop: iterate files in a mod's cached JSZip archive, extract text, perform case-insensitive string matching, collect matching lines with ±1 context
- [x] 2.5 Implement batched yielding (`setTimeout(0)` every N files) to keep the UI responsive during large searches
- [x] 2.6 Implement search cancellation via generation counter so a new search aborts any in-progress search
- [x] 2.7 Implement streaming result rendering: append a `DocumentFragment` per mod group as each mod completes scanning
- [x] 2.8 Implement the summary bar that updates progressively (files searched, matches found, mods matched)
- [x] 2.9 Implement Current File subtab logic (search only `this.currentMod`)
- [x] 2.10 Implement Session subtab logic (search all `this.sessionMods`)
- [x] 2.11 Implement click-to-select on mod group headers (calls `app.selectMod()`)

## 3. Integration

- [x] 3.1 Register `SearchTab` in `main.mjs` tab map and wire `onFileProcessed` / `setCurrentMod` / `clear` lifecycle calls
- [x] 3.2 Ensure `switchTab` and `switchSubTab` in `main.mjs` handle the new `search` tab and `search-file` / `search-session` subtabs

## 4. Verification

- [ ] 4.1 Test Current File search: upload a single mod, search for a known string, verify results show matching lines with context
- [ ] 4.2 Test Session search: upload multiple mods, search, verify results grouped by mod with correct summary counts
- [ ] 4.3 Test cancellation: start a search, immediately submit a new query, verify only the second query's results appear
- [ ] 4.4 Test responsiveness: upload 50+ mods, run a session search, verify the UI remains interactive during scanning
- [ ] 4.5 Test edge cases: empty query rejected, no mod selected on Current File subtab shows message, binary files skipped
