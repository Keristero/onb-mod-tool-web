# Implementation Tasks: Track File Duplication Across Mods

## Phase 1: Core Infrastructure (Foundational)

### Task 1: Create hash computation utility
- [x] Create `src/web/js/utils/hash-utils.mjs`
- [x] Implement `computeHash(data)` using Web Crypto API (`crypto.subtle.digest`)
- [x] Convert hash buffer to 64-character lowercase hex string
- [x] Add error handling for invalid inputs and missing API
- [x] Manually test with known test vectors (empty string, "Hello, World!")
- [x] Verify hash matches expected SHA-256 values

**Deliverable**: Working hash utility that produces correct SHA-256 hashes  
**Validation**: Run hash on known inputs, compare against online SHA-256 calculator  
**Dependencies**: None  
**Estimated effort**: 1 hour

### Task 2: Create DuplicationTracker class
- [x] Create `src/web/js/duplication-tracker.mjs`
- [x] Export DuplicationTracker class with constructor
- [x] Initialize internal data structures in constructor: `fileRegistry` Map, `metricsCache` object
- [x] Implement `reset()` method to clear all data
- [x] Manually test instance creation and reset

**Deliverable**: DuplicationTracker class that can be instantiated  
**Validation**: Create instance, register files, reset, verify state cleared  
**Dependencies**: None  
**Estimated effort**: 1 hour

### Task 3: Implement file registration in DuplicationTracker
- [x] Implement `registerFile(modId, modName, filePath, hash, size)` method
- [x] Create FileInfo structure: `{hash, size, locations: []}`
- [x] Handle first registration (create new entry)
- [x] Handle duplicate registration (append location to existing entry)
- [x] Prevent duplicate locations for same mod+path combination
- [x] Invalidate metrics cache on registration

**Deliverable**: Working file registration that builds the duplication registry  
**Validation**: Register same hash from different mods, verify locations array grows  
**Dependencies**: Task 2  
**Estimated effort**: 2 hours

### Task 4: Implement mod unregistration in DuplicationTracker
- [x] Implement `unregisterMod(modId)` method
- [x] Iterate through all FileInfo entries in registry
- [x] Remove locations matching the specified modId
- [x] Delete FileInfo entries with empty locations arrays
- [x] Invalidate metrics cache on unregistration
- [x] Handle non-existent modId gracefully (no-op)

**Deliverable**: Clean removal of all files from a specific mod  
**Validation**: Register files, unregister mod, verify registry updated correctly  
**Dependencies**: Task 3  
**Estimated effort**: 1.5 hours

## Phase 2: Metrics and Queries (Analysis)

### Task 5: Implement metrics calculation
- [x] Implement `getMetrics()` method with caching
- [x] Calculate `totalDuplicatedBytes` (sum of all file sizes × occurrences)
- [x] Calculate `potentialSavings` (sum of (size × (count - 1)) for duplicates)
- [x] Calculate `uniqueFiles`, `duplicatedFiles`, `duplicationRate`
- [x] Cache computed metrics with timestamp
- [x] Return cached metrics if registry hasn't changed

**Deliverable**: Accurate storage metrics for duplication analysis  
**Validation**: Manually compute expected metrics for test data, compare  
**Dependencies**: Task 3  
**Estimated effort**: 2 hours

### Task 6: Implement duplicated files query
- [x] Implement `getDuplicatedFiles(sortBy)` method
- [x] Filter registry to only files with `locations.length > 1`
- [x] Support sorting by 'count', 'size', 'impact' (count × size)
- [x] Return array of FileInfo objects in sorted order
- [x] Handle empty registry (return empty array)

**Deliverable**: Query method that returns sorted list of duplicates  
**Validation**: Register files with different duplication patterns, verify sort order  
**Dependencies**: Task 3  
**Estimated effort**: 1.5 hours

### Task 7: Implement file details query
- [x] Implement `getFileDetails(hash)` method
- [x] Look up hash in registry, return full FileInfo object
- [x] Return null if hash not found
- [x] Include all locations with complete metadata

**Deliverable**: Hash-based lookup for file details  
**Validation**: Query existing and non-existent hashes  
**Dependencies**: Task 3  
**Estimated effort**: 30 minutes

## Phase 3: Integration with Processing Pipeline (Integration)

### Task 8: Integrate hashing into mod processing
- [x] Add `duplicationTracker` instance creation in ModAnalyzer constructor: `this.duplicationTracker = new DuplicationTracker()`
- [x] Pass tracker to StatisticsTab: `new StatisticsTab(this.duplicationTracker)`
- [x] Modify `processFile()` in `main.mjs` to extract and hash files
- [x] After JSZip extraction, iterate through `zipArchive.files`
- [x] For each non-directory file, get Uint8Array with `zipEntry.async('uint8array')`
- [x] Compute hash using `computeHash(fileData)`
- [x] Call `this.duplicationTracker.registerFile(...)` with hash
- [x] Ensure hashing doesn't block UI (use async/await properly)
- [x] Add error handling (continue processing on hash failure)

**Deliverable**: Automatic file hashing and registration during mod processing  
**Validation**: Process test mods, verify files appear in DuplicationTracker  
**Dependencies**: Tasks 1, 3  
**Estimated effort**: 2 hours

### Task 9: Integrate unregistration with session clearing
- [x] Modify `clearHistory()` in `main.mjs` to call `this.duplicationTracker.reset()`
- [x] Modify individual mod removal to call `this.duplicationTracker.unregisterMod(modId)`
- [x] Ensure Statistics tab refreshes after clearing

**Deliverable**: Tracker state syncs with session state  
**Validation**: Process mods, clear session, verify tracker is empty  
**Dependencies**: Task 4, Task 8  
**Estimated effort**: 1 hour

## Phase 4: UI - Duplication Report (User-Facing)

### Task 10: Add duplication report section to Statistics Tab
- [x] Modify StatisticsTab constructor to accept `duplicationTracker` parameter
- [x] Store tracker reference: `this.duplicationTracker = duplicationTracker`
- [x] Add new `renderDuplicationReport()` method
- [x] Call `renderDuplicationReport()` from `renderSessionStats()`
- [x] Check if session has ≥2 mods, show "Process multiple mods" message if not
- [x] Query this.duplicationTracker for metrics and duplicated files
- [x] Render empty state if no duplicates found

**Deliverable**: New section in Session Statistics for duplication  
**Validation**: Process multiple mods, verify section appears with data  
**Dependencies**: Tasks 5, 6  
**Estimated effort**: 1.5 hours

### Task 11: Render overview metrics cards
- [x] Implement `renderDuplicationMetrics(metrics)` method
- [x] Display 4 cards: Total Duplicated, Potential Savings, Duplication Rate, Top File
- [x] Format bytes using `formatBytes()` utility
- [x] Format percentages for duplication rate
- [x] Match styling of existing statistics cards

**Deliverable**: Visual metrics display at top of duplication report  
**Validation**: Verify metrics match expected calculations  
**Dependencies**: Task 10  
**Estimated effort**: 1.5 hours

### Task 12: Render duplicated files table
- [x] Implement `renderDuplicatedFilesTable(files)` method
- [x] Create table with columns: File Path, Occurrences, Size, Total Impact
- [x] Make column headers clickable for sorting
- [x] Format file paths (show basename prominently, full path in tooltip)
- [x] Format sizes and impact using `formatBytes()`
- [x] Limit to top 50 files, show "Showing X of Y" message
- [x] Add click handlers to rows for drill-down

**Deliverable**: Interactive table of duplicated files  
**Validation**: Click columns to sort, verify correct ordering  
**Dependencies**: Task 10  
**Estimated effort**: 3 hours

### Task 13: Implement table sorting
- [x] Add click handlers to table headers
- [x] Store current sort field and direction in component state
- [x] Call `getDuplicatedFiles(sortBy)` with appropriate parameter
- [x] Re-render table with new sort order
- [x] Add visual indicator (arrow icon) for active sort column

**Deliverable**: Sortable columns in duplicated files table  
**Validation**: Click each column, verify sort order changes correctly  
**Dependencies**: Task 12  
**Estimated effort**: 1 hour

## Phase 5: UI - Drill-Down and Preview (Detailed View)

### Task 14: Implement file drill-down panel
- [x] Implement `renderFileDrillDown(fileInfo)` method
- [x] Show panel below table when file is selected
- [x] Display file path, hash (truncated), size, occurrence count
- [x] List all locations (modName + filePath within mod)
- [x] Make mod names clickable to navigate to File Browser
- [x] Add close button or click-to-toggle behavior

**Deliverable**: Expandable panel showing where file appears  
**Validation**: Click file in table, verify locations listed correctly  
**Dependencies**: Task 12  
**Estimated effort**: 2 hours

### Task 15: Add file content preview to drill-down
- [ ] Fetch file content from one of the mods' zipArchives
- [ ] Detect file type from extension
- [ ] Apply syntax highlighting using highlight.js
- [ ] Limit preview to first 500 lines (add "truncated" indicator if needed)
- [ ] Show file size and line count metadata
- [ ] Reuse FilePreviewMixin methods where possible

**Deliverable**: Code preview within drill-down panel  
**Validation**: Select Lua file, verify syntax highlighting applied  
**Dependencies**: Task 14  
**Estimated effort**: 2 hours

### Task 16: Implement navigation to File Browser from drill-down
- [ ] Add click handlers to mod names in locations list
- [ ] On click, call app-level method to switch to File Browser tab
- [ ] Pass modId and filePath to File Browser
- [ ] File Browser should select the mod and navigate to the file
- [ ] Highlight the selected file in the file tree

**Deliverable**: Seamless navigation from duplication report to file browser  
**Validation**: Click mod name, verify File Browser opens with file selected  
**Dependencies**: Task 14  
**Estimated effort**: 1.5 hours

## Phase 6: Export and Polish (Finishing)

### Task 17: Add CSV export for duplication data
- [x] Extend `data-exporter.mjs` with `exportDuplicationCSV(tracker)` function
- [x] Query all duplicated files from tracker
- [x] Generate CSV with headers: "File Path, Hash, Size (bytes), Occurrences, Total Impact (bytes), Mods"
- [x] Format locations as comma-separated list of mod names
- [x] Trigger download with filename "duplication-report-[timestamp].csv"
- [x] Add "Export CSV" button to duplication report section

**Deliverable**: CSV download of duplication data  
**Validation**: Export data, open in spreadsheet, verify columns and values  
**Dependencies**: Task 6  
**Estimated effort**: 1.5 hours

### Task 18: Add XML export for duplication data
- [x] Extend `data-exporter.mjs` with `exportDuplicationXML(tracker)` function
- [x] Generate XML structure with <summary> and <files> sections
- [x] Include aggregate metrics in summary
- [x] Include each file with nested <location> elements
- [x] Trigger download with filename "duplication-report-[timestamp].xml"
- [x] Add "Export XML" button to duplication report section

**Deliverable**: XML download of duplication data  
**Validation**: Export data, validate XML structure  
**Dependencies**: Task 6  
**Estimated effort**: 1.5 hours

### Task 19: Add copy-to-clipboard functionality
- [ ] Add [📋] clipboard icon to each file row in table
- [ ] Implement click handler to format file locations as text
- [ ] Use Clipboard API: `navigator.clipboard.writeText(text)`
- [ ] Show toast notification "Copied to clipboard" on success
- [ ] Handle clipboard API not available (show alert fallback)

**Deliverable**: Quick copy of file locations for sharing  
**Validation**: Click icon, paste into text editor, verify format  
**Dependencies**: Task 12  
**Estimated effort**: 1 hour

### Task 20: Performance testing and optimization
- [ ] Test with large mod (50 MB, 500+ files)
- [ ] Measure hashing overhead in processFile()
- [ ] Verify hashing adds < 10% to total processing time
- [ ] Test session with 20+ mods
- [ ] Monitor memory usage in browser DevTools
- [ ] Optimize if performance targets not met (batch processing, worker offload)

**Deliverable**: Performance validation and optimization  
**Validation**: Process large test suite, measure times and memory  
**Dependencies**: All previous tasks  
**Estimated effort**: 2 hours

### Task 21: Manual testing and polish
- [ ] Test with real mod files containing known duplicates
- [ ] Verify all UI interactions work correctly
- [ ] Check responsive design on different screen sizes
- [ ] Verify empty states display correctly
- [ ] Check error handling (malformed mods, missing files)
- [ ] Fix any styling inconsistencies
- [ ] Add loading indicators if needed

**Deliverable**: Polished, tested feature ready for use  
**Validation**: Comprehensive manual testing checklist  
**Dependencies**: All previous tasks  
**Estimated effort**: 3 hours

## Summary

**Total Tasks**: 21  
**Estimated Total Effort**: 34-36 hours  
**Critical Path**: Tasks 1→3→8→10→12→14→15 (core functionality)  
**Parallelizable**: Tasks 17-19 (export features) can be done concurrently

**Validation Strategy**: Each task includes specific validation criteria for verification before moving to dependent tasks.
