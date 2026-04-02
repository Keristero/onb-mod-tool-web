# Implementation Tasks: Distinguish Validation Warnings

## Phase 1: Error Classification and Core Parsing

### Task 1.1: Update parser.extractErrors() to classify WARN: prefix
- **What**: Modify error extraction to detect and tag warnings separately
- **Where**: `src/web/js/parser.mjs::extractErrors()`
- **Details**:
  - When processing stderr lines, check if line starts with `WARN:`
  - If yes, set type: 'warning'
  - If line starts with `ERR:` or has no prefix, set type: 'error'
  - Return array of {type, message, line} objects
  - Remove prefix from message (e.g., \"WARN: \" → \"\")
  - Keep existing context-line skipping logic
- **Validation**: 
  - Test with WARN: prefixed lines → classified as warning
  - Test with ERR: prefixed lines → classified as error
  - Test with location-based errors → classified as error
  - Test with mixed content → all correctly classified
- **Estimate**: 30 minutes

### Task 1.2: Add errorCategories.warnings to mod object structure
- **What**: Extend mod object to store warnings separately from errors
- **Where**: `src/web/js/main.mjs` (mod processing/categorization section)
- **Details**:
  - Initialize `mod.errorCategories.warnings = []`
  - After error extraction, separate errors from warnings
  - Push errors to errorCategories.stderr (existing)
  - Push warnings to errorCategories.warnings (new)
  - Ensure both arrays coexist without conflict
- **Validation**:
  - Mod with warnings has non-empty errorCategories.warnings
  - Mod with errors has non-empty errorCategories.stderr
  - Mod with both has both populated correctly
- **Estimate**: 20 minutes

### Task 1.3: Verify error categorization doesn't break existing flow
- **What**: Test that existing error detection and categorization still works
- **Where**: Integration test across parser.mjs and main.mjs
- **Details**:
  - Load 3 test mods: one with errors only, one with warnings only, one with both
  - Verify errorCategories structure is complete
  - Verify counts are accurate
  - Verify no warnings are misclassified as errors (and vice versa)
- **Validation**:
  - All test mods process without error
  - Error and warning counts match expectations
  - Existing error detection unaffected
- **Estimate**: 15 minutes

---

## Phase 2: Mod Validation Status Logic

### Task 2.1: Add 'success-with-warnings' status value
- **What**: Introduce new status for mods with warnings but no errors
- **Where**: `src/web/js/main.mjs` (mod status determination)
- **Details**:
  - Current logic: 'failed' → 'validation-failed' → 'success'
  - New logic: 'failed' → 'validation-failed' → 'success-with-warnings' → 'success'
  - After all error checks, if no errors but warnings exist → 'success-with-warnings'
  - If no errors and no warnings → 'success'
- **Validation**:
  - Mod with only warnings gets status 'success-with-warnings'
  - Mod with errors gets 'failed' or 'validation-failed' (warnings ignored)
  - Mod with no warnings gets 'success'
- **Estimate**: 15 minutes

### Task 2.2: Test status logic with edge cases
- **What**: Verify status assignment handles all combinations
- **Where**: Integration test with test fixtures
- **Details**:
  - Test: Parser error + warnings → 'failed'
  - Test: Validation error + warnings → 'validation-failed'
  - Test: Warnings only → 'success-with-warnings'
  - Test: No errors, no warnings → 'success'
  - Test: Empty errorCategories → 'success'
- **Validation**:
  - All scenarios produce correct status
  - Status prioritizes errors over warnings
- **Estimate**: 15 minutes

---

## Phase 3: Statistics Tracking

### Task 3.1: Add warning tracking to calculateStatistics()
- **What**: Extend statistics calculator to count and aggregate warnings
- **Where**: `src/web/js/tabs/utilities/statistics-calculator.mjs::calculateStatistics()`
- **Details**:
  - Count mods with status 'success-with-warnings' → `successWithWarnings`
  - Calculate `validWithWarningsRate = (successful + successWithWarnings) / total * 100`
  - Add new field: `totalWarnings` = sum of mod.errorCategories.warnings.length
  - Initialize tracking objects: warningMessages, warningTypes
- **Validation**:
  - successWithWarnings count is accurate
  - validWithWarningsRate percentage correct (formatted to 1 decimal)
  - totalWarnings matches sum
- **Estimate**: 30 minutes

### Task 3.2: Aggregate warning messages (reuse error logic)
- **What**: Build message occurrence tracking for warnings
- **Where**: `src/web/js/tabs/utilities/statistics-calculator.mjs::calculateStatistics()`
- **Details**:
  - For each mod with warnings, extract message text
  - Track occurrence count: `warningMessages[message] = count`
  - Apply same message limiting logic as errors: top 100 by occurrence
  - Ensure warning message aggregation is identical structure to stderrMessages
- **Validation**:
  - Most common warnings appear first
  - Occurrence counts are accurate
  - Message limit doesn't lose high-occurrence warnings
- **Estimate**: 20 minutes

### Task 3.3: Add warning types categorization
- **What**: Categorize warnings by type (stderr, validation, etc.)
- **Where**: `src/web/js/tabs/utilities/statistics-calculator.mjs`
- **Details**:
  - Track warning type counts in warningTypes object
  - For now, primary source is stderr warnings (\"Warnings\": count)
  - Structure matches errorTypes for consistency
  - Leave extensibility for future validation warnings
- **Validation**:
  - warningTypes object populated correctly
  - Counts match total warning count
- **Estimate**: 15 minutes

---

## Phase 4: Results Tab UI - Warnings Display

### Task 4.1: Add warning section to console output rendering
- **What**: Create separate warnings section in results tab
- **Where**: `src/web/js/tabs/results-tab.mjs::renderConsoleOutput()`
- **Details**:
  - Check if mod has warnings in errorCategories.warnings
  - If yes, create expandable section: `<details><summary>Warnings (N)</summary>...`
  - Render each warning as list item with message
  - Apply greenish-yellow styling (CSS class .warning-item)
  - Collapse warnings section by default
  - Place warnings section below errors section
- **Validation**:
  - Mods with warnings show collapsible section
  - Mods without warnings don't show section
  - Warnings display with correct count in header
- **Estimate**: 30 minutes

### Task 4.2: Update summary card to show warning count
- **What**: Add warning count to mod summary display
- **Where**: `src/web/js/tabs/results-tab.mjs::renderSummary()`
- **Details**:
  - Extract warning count from mod.errorCategories.warnings.length
  - Create summary item: \"Warnings: {count}\"
  - Position near errors summary item
  - Use greenish-yellow styling (.summary-item.warning class)
  - Show even if count is 0 (with grayed styling)
- **Validation**:
  - Warning count displayed correctly
  - Position is near other validation info
  - Styling is consistent
- **Estimate**: 20 minutes

### Task 4.3: Add CSS class for warning styling in results
- **What**: Define .warning-item CSS class
- **Where**: `src/web/css/styles.css`
- **Details**:
  - Add class .warning-item with:
    - Left border: 3px solid var(--validation-warning-color)
    - Background: rgba(192, 202, 51, 0.08)
    - Padding consistent with error items
  - Ensure text is readable against background
  - Use existing color variable (defined in later phase)
- **Validation**:
  - Warning items display with correct styling
  - Text is readable
  - Styling is consistent across all warning items
- **Estimate**: 15 minutes

---

## Phase 5: Statistics Tab - Warning Aggregation Display

### Task 5.1: Add validWithWarningsRate to overview cards
- **What**: Display \"Valid Mods with Warnings %\" in session view
- **Where**: `src/web/js/tabs/statistics-tab.mjs::renderOverviewCards()`
- **Details**:
  - Check if mode === 'session' (only show for aggregated stats)
  - Extract validWithWarningsRate from stats object
  - Create card: \"Valid Mods with Warnings %: {rate}%\"
  - Position near Success Rate card
  - Use greenish-yellow styling
- **Validation**:
  - Card appears only in session view, not file view
  - Percentage formatted correctly (1 decimal place)
  - Card is clickable/hoverable (consistent with other cards)
- **Estimate**: 20 minutes

### Task 5.2: Add expandable warnings section to statistics
- **What**: Show most common warnings in collapsible section
- **Where**: `src/web/js/tabs/statistics-tab.mjs::renderStats()`
- **Details**:
  - Check if stats.totalWarnings > 0
  - Create expandable section using errorDetails() helper (reuse logic)
  - Pass warningMessages from stats
  - Render using renderErrorMessagesChart() but with warning color
  - Section title: \"Most Common Warnings (N)\"
  - Collapse by default
- **Validation**:
  - Section appears only when warnings exist
  - Warning messages display in bar chart format
  - Chart uses correct color and formatting
- **Estimate**: 25 minutes

### Task 5.3: Update overview cards to show warning count
- **What**: Add \"Warnings: N\" card to statistics overview
- **Where**: `src/web/js/tabs/statistics-tab.mjs::renderOverviewCards()`
- **Details**:
  - Extract totalWarnings from stats
  - Create card with warning count and icon
  - Use greenish-yellow styling
  - Position near error count card
  - Show 0 if no warnings (with grayed styling)
- **Validation**:
  - Warning count card displays accurately
  - Styling is consistent with other cards
  - Works for both file and session views
- **Estimate**: 15 minutes

---

## Phase 6: Data Export Support

### Task 6.1: Update CSV export to include warnings
- **What**: Add warning columns and data to CSV export
- **Where**: `src/web/js/tabs/utilities/data-exporter.mjs::exportToCSV()`
- **Details**:
  - Add columns: \"Warnings\", \"Most Common Warning\"
  - For each mod, extract warning count
  - For each mod, get most common warning message (if any)
  - Include aggregate warning statistics in summary rows
- **Validation**:
  - CSV opens correctly in spreadsheet applications
  - Warning data is accurate and properly formatted
  - All mods have warning counts
- **Estimate**: 20 minutes

### Task 6.2: Update XML export to include warnings
- **What**: Add warning XML elements to export
- **Where**: `src/web/js/tabs/utilities/data-exporter.mjs::exportToXML()`
- **Details**:
  - Add elements: `<warnings>`, `<warningCount>`, `<validWithWarningsRate>`
  - Structure warnings parallel to existing errors structure
  - Include individual mod warnings and aggregated statistics
- **Validation**:
  - XML is well-formed and valid
  - Warning data matches CSV export
  - Can be parsed programmatically
- **Estimate**: 20 minutes

---

## Phase 7: Styling and Visual Theme

### Task 7.1: Define validation warning color variable
- **What**: Add CSS variable for yellowish-lime green
- **Where**: `src/web/css/styles.css` (:root)
- **Details**:
  - Add: `--validation-warning-color: #C0CA33;`
  - Add comment: \"Yellowish-lime green for validation warnings\"
  - Place after other status colors for organization
- **Validation**:
  - Color variable is accessible in CSS rules
  - Color displays correctly when applied
  - Hex value is correct
- **Estimate**: 5 minutes

### Task 7.2: Add warning-themed CSS classes
- **What**: Create CSS utilities for warning styling
- **Where**: `src/web/css/styles.css`
- **Details**:
  - Add .summary-item.warning class (border and text color)
  - Extend existing .summary-status-item for success-with-warnings status
  - Add .warning-chart-bar for bar chart coloring (if needed)
  - Ensure consistency with error styling patterns
- **Validation**:
  - All warning elements render with correct color
  - Text is readable against all backgrounds
  - Styling is consistent across UI
- **Estimate**: 15 minutes

### Task 7.3: Visual regression testing
- **What**: Test warning display across multiple scenarios
- **Where**: Manual testing with test fixtures
- **Details**:
  - Load mods with warnings only
  - Load mods with errors and warnings
  - Load mods with no warnings
  - Verify colors, borders, backgrounds display correctly
  - Test on different browsers (Chrome, Firefox, Safari)
  - Test with Windows High Contrast mode (accessibility)
- **Validation**:
  - All scenarios render correctly
  - Color is visually distinct and accessible
  - No layout shifts or rendering issues
- **Estimate**: 30 minutes

---

## Phase 8: Integration and Validation

### Task 8.1: End-to-end testing with test mods
- **What**: Process mods through entire pipeline with warnings
- **Where**: Full application flow
- **Details**:
  - Use 5 test fixtures:
    - Mod with no warnings (baseline)
    - Mod with only warnings
    - Mod with errors and warnings
    - Mod with parser error (should not show success-with-warnings)
    - Mod with validation error + warnings (should show validation-failed, not success-with-warnings)
  - Verify status is correct for each
  - Verify UI displays warning count and list correctly
  - Verify statistics aggregated correctly
- **Validation**:
  - All test scenarios pass
  - No regression in existing functionality
  - Performance acceptable (< 100ms per mod)
- **Estimate**: 40 minutes

### Task 8.2: Performance testing
- **What**: Ensure warning processing doesn't introduce lag
- **Where**: Statistics calculator and UI rendering
- **Details**:
  - Process 300 mods, measure statistics calculation time
  - Measure UI rendering time for session statistics
  - Measure CSV/XML export time
  - Verify all operations complete in acceptable time
- **Validation**:
  - Statistics calculation: < 10ms for 300 mods
  - Statistics rendering: < 50ms
  - Export: < 500ms
  - No noticeable UI lag or jank
- **Estimate**: 20 minutes

### Task 8.3: Documentation and comment updates
- **What**: Document warning feature in code comments and README
- **Where**: Key files and project documentation
- **Details**:
  - Add JSDoc comments to warning-related functions
  - Update parser.mjs and main.mjs comment sections
  - Update TASKS_REFERENCE.md with warning feature details
  - Add section in README about warning handling
- **Validation**:
  - Code is well-documented
  - Future developers understand warning flow
  - Comments explain \"why\", not just \"what\"
- **Estimate**: 15 minutes

---

## Summary Timeline

- **Phase 1** (Error Classification): ~65 minutes
- **Phase 2** (Status Logic): ~45 minutes
- **Phase 3** (Statistics): ~65 minutes
- **Phase 4** (Results UI): ~85 minutes
- **Phase 5** (Statistics UI): ~60 minutes
- **Phase 6** (Data Export): ~40 minutes
- **Phase 7** (Styling): ~50 minutes
- **Phase 8** (Integration): ~75 minutes

**Total Estimate**: ~485 minutes (~8 hours)

**Recommended Parallelization**:
- Phases 1-3 are sequential (each depends on previous)
- Phases 4-5 can start once Phase 3 completes (parallel after Phase 3)
- Phase 6 can run in parallel with Phases 4-5 (uses existing data)
- Phase 7 can start after Phase 1 (just needs variable defined)
- Phase 8 should run after all other phases

**Actual Parallelized Timeline**: ~5-6 hours
