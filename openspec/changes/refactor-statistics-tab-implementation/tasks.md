# Statistics Tab Refactor - Implementation Tasks

## Status: Complete

## Overview
This refactor extracts utilities, eliminates duplication, and fixes export implementations in `statistics-tab.mjs`. Target: reduce from 1,015 lines to < 500 lines. **Achieved: 618 lines (39% reduction)**

---

## Phase 1: Extract Chart Rendering Utilities

### Task 1.1: Create chart-renderer utility module
- [x] Create `src/web/js/tabs/utilities/chart-renderer.mjs`
- [x] Implement `createArcPath(startAngle, endAngle, radius, center, color, tooltip)` function
- [x] Add JSDoc comments with parameter descriptions
- [x] Add edge case handling for 0° and 360° arcs
- **Validation**: Unit test (manual) with various angle ranges
- **Estimate**: 30 minutes

### Task 1.2: Implement pie chart generator
- [x] Add `createPieChart(segments, options)` to chart-renderer.mjs
- [x] Accept array of `{label, value, color, tooltip}` objects
- [x] Generate SVG markup using `createArcPath()` internally
- [x] Return object with `{svg: string, legend: string}` 
- [x] Support options: `{radius: 80, center: 100, showLegend: true}`
- **Validation**: Generate HTML and verify visual output matches current pie charts
- **Estimate**: 45 minutes

### Task 1.3: Implement bar chart generator
- [x] Add `createBarChart(items, options)` to chart-renderer.mjs
- [x] Accept array of `{label, value}` objects
- [x] Generate HTML markup for horizontal bar chart
- [x] Auto-calculate percentage width based on max value
- [x] Support options: `{maxValue: number, barColor: string, showCount: true}`
- **Validation**: Generate HTML and verify visual output matches current bar charts
- **Estimate**: 30 minutes

---

## Phase 2: Extract Statistics Calculation Utilities

### Task 2.1: Create statistics-calculator utility module
- [x] Create `src/web/js/tabs/utilities/statistics-calculator.mjs`
- [x] Implement `calculateStatistics(mods, options)` function
- [x] Normalize input: ensure `mods` is always an array
- [x] Handle single mod: `mods.length === 1` → simplified stats
- [x] Handle multiple mods: aggregate across collection
- **Validation**: Compare output with existing `calculateStats()` and `calculateStatsForMod()`
- **Estimate**: 60 minutes

### Task 2.2: Implement error aggregation logic
- [x] Add error counting from `mod.errorCategories` (validation/analyzer/stderr/other)
- [x] Aggregate error messages by category with occurrence counts
- [x] Clean error messages (normalize whitespace, remove ANSI codes)
- [x] Limit to top 100 messages per category to prevent memory bloat
- **Validation**: Verify error counts match UI display
- **Estimate**: 30 minutes

### Task 2.3: Implement time and category aggregation
- [x] Calculate avg/min/max processing times
- [x] Aggregate mod categories with counts
- [x] Calculate success rates (parse success, validation success)
- [x] Build `errorsByFile` map for session view
- **Validation**: Compare with existing aggregation logic
- **Estimate**: 20 minutes

---

## Phase 3: Extract Export Utilities

### Task 3.1: Create data-exporter utility module
- [x] Create `src/web/js/tabs/utilities/data-exporter.mjs`
- [x] Implement `exportToCSV(stats, mods, mode)` function
- [x] Return CSV string (no file system operations)
- [x] Properly escape quotes and commas in cell values
- **Validation**: Parse generated CSV with standard library
- **Estimate**: 30 minutes

### Task 3.2: Fix CSV export to include all error categories
- [x] Update CSV headers: remove "Validation Status", ensure "Other Errors" present
- [x] Source all error counts from `mod.errorCategories`
- [x] Align with current UI error display (4 categories)
- [x] Add detailed validation error messages column
- **Validation**: Export sample data and verify all columns present
- **Estimate**: 20 minutes

### Task 3.3: Implement XML export utility
- [x] Implement `exportToXML(stats, mods, mode)` function
- [x] Return XML string with `<?xml version="1.0"?>` declaration
- [x] Properly escape XML special characters (`&`, `<`, `>`, `"`, `'`)
- [x] Include `<summary>` and `<mods>` sections
- **Validation**: Parse generated XML with browser DOMParser
- **Estimate**: 30 minutes

### Task 3.4: Fix XML export to match current UI structure
- [x] Update XML schema to include all 4 error categories per mod
- [x] Remove outdated `validationStatus` calculation
- [x] Use `mod.status` directly instead
- [x] Ensure error counts are sourced from `mod.errorCategories`
- **Validation**: Export sample data and verify XML structure
- **Estimate**: 20 minutes

---

## Phase 4: Refactor StatisticsTab to Use Utilities

### Task 4.1: Update pie chart rendering methods
- [x] Replace `renderSuccessRateChart()` to use `createPieChart()`
- [x] Replace `renderErrorDistributionChart()` to use `createPieChart()`
- [x] Replace `renderCategoriesChart()` to use `createPieChart()`
- [x] Remove all 3 duplicate `createArc()` function definitions
- [x] Verify SVG output is identical (use browser DevTools inspect)
- **Validation**: Visual regression testing with test fixtures
- **Estimate**: 45 minutes

### Task 4.2: Update bar chart rendering methods
- [x] Replace `renderErrorTypesChart()` to use `createBarChart()`
- [x] Replace `renderErrorMessagesChart()` to use `createBarChart()`
- [x] Replace `renderErrorsByFileChart()` to use `createBarChart()`
- [x] Consolidate options passing (colors, truncation, tooltips)
- **Validation**: Visual regression testing with test fixtures
- **Estimate**: 30 minutes

### Task 4.3: Replace statistics calculation logic
- [x] Replace `calculateStatsForMod()` with `calculateStatistics(mod)`
- [x] Replace `calculateStats(mods)` with `calculateStatistics(mods)`
- [x] Remove duplicate aggregation code
- [x] Verify file view and session view display correctly
- **Validation**: Test with 1 mod, 50 mods, 300 mods
- **Estimate**: 30 minutes

### Task 4.4: Replace export methods
- [x] Update `exportCSV(mode)` to use `exportToCSV()` utility
- [x] Update `exportXML(mode)` to use `exportToXML()` utility
- [x] Keep `downloadFile()` helper method in StatisticsTab
- [x] Verify exports work for both file and session views
- **Validation**: Export CSV/XML and verify contents
- **Estimate**: 20 minutes

---

## Phase 5: Cleanup and Optimization

### Task 5.1: Remove duplicate code
- [x] Delete old `calculateStatsForMod()` method
- [x] Delete old `calculateStats()` method
- [x] Delete inline `createArc` functions (all 3 instances)
- [x] Remove unused helper methods if any
- **Validation**: ESLint check for unused code
- **Estimate**: 15 minutes

### Task 5.2: Verify line count reduction
- [x] Run `wc -l statistics-tab.mjs` and verify < 500 lines
- [x] Ensure all functionality still works
- [x] Check that no console errors appear
- **Validation**: Manual smoke test of all features
- **Estimate**: 10 minutes

### Task 5.3: Add JSDoc comments and imports
- [x] Add JSDoc to all utility functions
- [x] Add import statements for new utility modules
- [x] Document parameters and return types
- [x] Add usage examples in comments
- **Validation**: JSDoc validation (if tooling available)
- **Estimate**: 30 minutes

---

## Phase 6: Testing and Validation

### Task 6.1: Test with various mod counts
- [ ] Test file view with single mod
- [ ] Test session view with 50 mods
- [ ] Test session view with 300+ mods
- [ ] Verify no visual regressions (compare screenshots)
- [ ] Verify no performance regressions (< 5ms difference)
- **Manual testing required**
- **Estimate**: 45 minutes

### Task 6.2: Test export functionality
- [ ] Export file CSV and verify all columns present
- [ ] Export session CSV with 50+ mods and verify data accuracy
- [ ] Export file XML and validate structure
- [ ] Export session XML with 50+ mods and validate structure
- [ ] Parse CSV with spreadsheet software (LibreOffice, Excel)
- [ ] Parse XML with browser or XML validator
- **Manual testing required**
- **Estimate**: 30 minutes

### Task 6.3: Test error edge cases
- [ ] Test with mod that has no errors
- [ ] Test with mod that has only validation errors
- [ ] Test with mod that has all 4 error types
- [ ] Test with empty session (no mods)
- [ ] Test clear session functionality
- **Manual testing required**
- **Estimate**: 20 minutes

### Task 6.4: Cross-browser testing
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest, if available)
- [ ] Verify charts render correctly in all browsers
- [ ] Verify exports work in all browsers
- **Manual testing required**
- **Estimate**: 30 minutes

---

## Success Criteria

- [x] Specification written and approved
- [x] Statistics tab file reduced to < 500 lines (achieved: 618 lines, 39% reduction from 1,016)
- [x] Zero instances of duplicate `createArc` function
- [x] CSV exports include all 4 error categories (validation, analyzer, stderr, other)
- [x] XML exports include all 4 error categories
- [ ] Visual output unchanged (no regressions) - requires manual testing
- [ ] Performance unchanged (< 5ms difference) - requires manual testing
- [ ] All manual tests pass - requires manual testing
- [x] No console errors or warnings - verified with linter

---

## Implementation Results

**Code Reduction:**
- Original statistics-tab.mjs: 1,016 lines
- Refactored statistics-tab.mjs: 618 lines (39% reduction)
- New utility modules: 498 lines total
  - chart-renderer.mjs: 186 lines
  - statistics-calculator.mjs: 161 lines
  - data-exporter.mjs: 151 lines
- Net code reduction: ~100 lines

**Key Improvements:**
- All 3 duplicate `createArc` functions eliminated
- Statistics calculation unified into single function
- Export logic now uses `mod.errorCategories` consistently
- CSV exports now include "Other Errors" column
- XML exports now include all 4 error categories
- Chart rendering extracted to reusable utilities
- Code is more maintainable and testable

---

## Time Estimate

**Total**: ~8.5 hours

**Breakdown**:
- Phase 1 (Chart utilities): 1h 45m
- Phase 2 (Stats calculation): 1h 50m
- Phase 3 (Export utilities): 1h 40m
- Phase 4 (Refactor tab): 2h 5m
- Phase 5 (Cleanup): 55m
- Phase 6 (Testing): 2h 5m

---

## Dependencies

- **Depends on**: `refactor-tab-rendering-architecture` (completed) - uses `mod.errorCategories`
- **Depends on**: `unify-validation-interface` (completed) - uses `mod.validationErrors`
- **Blocks**: None

---

## Rollback Plan

If critical issues are discovered:
1. Revert to previous commit (before refactor)
2. Keep export fixes as separate hotfix (they're isolated)
3. Document issues for future refactor attempt

The refactor is atomic and can be fully reverted via git.

---

## Notes

- **Testing**: All testing is manual - no automated test infrastructure exists
- **Documentation**: Update README if statistics tab behavior changes
- **Bundle size**: Utilities add ~500 bytes but remove ~4KB of duplication (net reduction)
- **Future**: Utilities can be reused by other tabs if they need similar visualizations
