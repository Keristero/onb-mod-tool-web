# Design Document: Statistics Tab Refactoring

## Overview

This refactoring addresses code quality issues in the 1,015-line `statistics-tab.mjs` by extracting reusable utilities and eliminating duplication without changing user-facing behavior.

## Architectural Decisions

### Decision 1: Extract Utilities vs. Keep Inline

**Options Considered:**
1. Extract utilities to separate files
2. Keep utilities as private methods in StatisticsTab class
3. Use a third-party charting library

**Chosen: Extract utilities to separate files**

**Rationale:**
- Utilities are pure functions with no StatisticsTab-specific state dependencies
- Makes testing possible without instantiating the full tab component
- Could be reused by other tabs (DependenciesTab uses D3.js but might benefit from simple bar charts)
- Keeps StatisticsTab focused on orchestration, not implementation details

**Trade-offs:**
- More files to navigate (+3 utility files)
- Slight indirection (but clear function boundaries mitigate this)
- Better than third-party library which adds bundle size and learning curve

### Decision 2: Unified vs. Separate Calculation Functions

**Options Considered:**
1. Unify `calculateStats()` and `calculateStatsForMod()` into single function
2. Keep separate functions and extract shared logic to helpers
3. Use polymorphic approach with strategy pattern

**Chosen: Unify into single function with optional parameters**

**Rationale:**
- Both functions calculate the same statistics (success rate, error counts, categories)
- Single mod is just a special case of multi-mod (array of length 1)
- Reduces 80+ lines of duplicate code
- Simpler to maintain consistent calculation logic

**Implementation:**
```javascript
function calculateStatistics(mods, options = {}) {
  // Normalize input: ensure mods is always an array
  const modArray = Array.isArray(mods) ? mods : [mods];
  
  // Single calculation path for both cases
  // ...
}
```

### Decision 3: Chart Utility Design Pattern

**Options Considered:**
1. Generic `createChart(type, data, options)` with type string
2. Separate functions per chart type: `createPieChart()`, `createBarChart()`
3. Chart builder class with fluent API

**Chosen: Separate functions per chart type**

**Rationale:**
- Pie charts and bar charts have fundamentally different data requirements and options
- TypeScript-like type safety via JSDoc (specific parameters per chart type)
- Simpler to use than builder pattern
- More explicit than generic function with type string

**API Design:**
```javascript
// Pie chart: array of {label, value, color}
createPieChart(segments, options)

// Bar chart: array of {label, value, maxValue?}
createBarChart(items, options)

// Shared utility (used by createPieChart internally)
createArcPath(startAngle, endAngle, radius, center, color, tooltip)
```

### Decision 4: File Organization Structure

**Options Considered:**
1. Flat structure: `tabs/chart-utilities.mjs`, `tabs/statistics-calculator.mjs`
2. Nested structure: `tabs/utilities/charts.mjs`, `tabs/utilities/statistics.mjs`
3. Shared utilities: `js/utilities/charts.mjs` (outside tabs folder)

**Chosen: Nested structure under `tabs/utilities/`**

**Rationale:**
- These utilities are tightly coupled to tab UI needs (not general-purpose)
- Keeps tab-related code together for easier discovery
- Avoids polluting the flat `tabs/` directory with utility files
- Clear separation: `tabs/*.mjs` = components, `tabs/utilities/*.mjs` = helpers

**File Structure:**
```
src/web/js/tabs/
├── base-tab.mjs
├── statistics-tab.mjs (refactored)
├── results-tab.mjs
├── ...
└── utilities/
    ├── chart-renderer.mjs      # SVG/HTML chart generation
    ├── statistics-calculator.mjs  # Stats aggregation logic
    └── data-exporter.mjs       # CSV/XML formatting
```

### Decision 5: Export Format Consistency Strategy

**Current Problem:**
CSV/XML exports have outdated fields that don't match current UI:
- Uses `validationStatus` (old) instead of `mod.status` (current)
- Calculates `analyzerErrors` inconsistently
- Missing "Other Errors" category entirely

**Chosen Approach:**
Standardize on `mod.errorCategories` as single source of truth

**Rationale:**
- `mod.errorCategories` is pre-computed during mod processing (see `refactor-tab-rendering-architecture`)
- Already used by UI rendering (line 177-184 in statistics-tab.mjs)
- Eliminates ad-hoc calculations during export
- Ensures UI and exports always match

**Implementation:**
```javascript
// OLD (inconsistent):
const analyzerErrors = ((mod.result && mod.result.success === false && mod.result.error) ? 1 : 0) + 
                       ((mod.parsed && mod.parsed.category === 'err') ? 1 : 0);

// NEW (consistent):
const validationErrors = mod.errorCategories?.validation?.length || 0;
const analyzerErrors = mod.errorCategories?.analyzer?.length || 0;
const stderrErrors = mod.errorCategories?.stderr?.length || 0;
const otherErrors = mod.errorCategories?.other?.length || 0;
```

## Migration Strategy

### Phase 1: Extract Utilities (No Behavior Change)
1. Copy chart rendering code to `chart-renderer.mjs`
2. Copy calculation code to `statistics-calculator.mjs`
3. Copy export code to `data-exporter.mjs`
4. Test that utilities work in isolation

### Phase 2: Refactor Statistics Tab to Use Utilities
1. Replace inline chart code with utility calls
2. Replace calculation logic with calculator utility
3. Replace export logic with exporter utility
4. Verify identical HTML/SVG output

### Phase 3: Fix Export Implementations
1. Update CSV headers to include "Other Errors"
2. Standardize on `mod.errorCategories` throughout
3. Align XML structure with current UI
4. Test CSV/XML exports with test fixtures

### Phase 4: Cleanup
1. Remove duplicate code from statistics-tab.mjs
2. Verify line count reduction (target: < 500 lines)
3. Add JSDoc comments to all utilities
4. Manual testing with various mod collections

## Testing Strategy

### Manual Testing Scenarios
1. **Single mod**: Verify file view displays correctly
2. **50 mods**: Verify session view aggregation and charts
3. **300+ mods**: Verify performance (no regressions)
4. **Export testing**: Compare CSV/XML before/after for correctness

### Validation Checklist
- [ ] All pie charts render identically
- [ ] All bar charts render identically
- [ ] Overview cards show same values
- [ ] CSV exports include all 4 error categories
- [ ] XML exports include all 4 error categories
- [ ] No console errors or warnings
- [ ] Memory usage unchanged (within 5%)
- [ ] Render time unchanged (within 5ms)

## Rollback Plan

If critical issues arise:
1. Revert utilities extraction (restore inline code)
2. Keep export fixes (they're isolated improvements)
3. File detailed bug report for follow-up

The refactor is structured to be incrementally reversible:
- Each utility file can be reverted independently
- Git history preserves original implementation
- No database migrations or persistent state changes

## Future Considerations

### Potential Enhancements (Out of Scope)
1. **Interactive charts**: Click to filter, zoom, drill-down
2. **Custom chart themes**: User-selectable color schemes
3. **Export to JSON**: For programmatic analysis
4. **Comparison mode**: Side-by-side comparison of two mod sets
5. **Historical tracking**: Track statistics over multiple sessions
6. **Chart animations**: Smooth transitions when data changes

### Utility Reusability
If other tabs need similar visualizations:
- DependenciesTab could use bar charts for dependency counts
- ResultsTab could use pie charts for error type distribution
- FileBrowserTab could use bar charts for file type counts

These would require minimal adaptation of the utilities.

## Dependencies and Constraints

### Depends On
- `refactor-tab-rendering-architecture` (completed) - uses `mod.errorCategories`
- `unify-validation-interface` (completed) - uses `mod.validationErrors`

### Constraints
- Must maintain vanilla JavaScript (no frameworks)
- Must preserve exact SVG/HTML structure for CSS compatibility
- Must work in all supported browsers (Chrome, Firefox, Safari latest)
- Must not increase bundle size by more than 1KB (minified + gzipped)

## Success Metrics

### Quantitative
- **Line count**: Statistics tab reduced from 1,015 to < 500 lines
- **Duplication**: Zero instances of duplicate `createArc` function
- **Export correctness**: 100% of error categories present in CSV/XML
- **Performance**: < 5ms difference in average render time

### Qualitative
- **Readability**: Reviewer can understand statistics-tab.mjs in < 10 minutes
- **Maintainability**: Adding a new chart type takes < 30 lines of code
- **Testability**: Utilities can be tested without browser environment (Node.js)
- **Consistency**: UI and exports always show identical data
