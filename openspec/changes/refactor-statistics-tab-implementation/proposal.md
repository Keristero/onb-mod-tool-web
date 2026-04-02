# Refactor Statistics Tab Implementation

## Problem Statement

The `statistics-tab.mjs` file has grown to 1,015 lines with significant code quality issues that impact maintainability and feature completeness:

1. **Heavy code duplication**: The `createArc` SVG generation function is duplicated 3 times (lines 582, 677, 859)
2. **Overlapping calculation logic**: `calculateStats()` and `calculateStatsForMod()` share ~70% similar code
3. **Incomplete export features**: CSV/XML exports don't match current error categorization (validation/analyzer/stderr/other)
4. **No code reuse for chart rendering**: Each chart type (success rate, error distribution, categories) repeats similar SVG/bar chart patterns
5. **Mixed responsibilities**: Calculation, rendering, export, and UI logic all intermingled without clear boundaries
6. **Inconsistent data transformations**: Multiple ad-hoc data massaging for different chart types

## Current Architecture

```
StatisticsTab (1,015 lines)
├── State Management (sessionMods, currentMod, view switching)
├── Data Calculation
│   ├── calculateStatsForMod() - Single mod stats
│   └── calculateStats() - Multi-mod aggregation
├── Rendering Methods (400+ lines)
│   ├── renderStats() - Main template
│   ├── renderOverviewCards() - Stat cards
│   ├── renderSuccessRateChart() - Pie chart with inline createArc
│   ├── renderErrorDistributionChart() - Pie chart with duplicate createArc
│   ├── renderCategoriesChart() - Pie chart with duplicate createArc
│   ├── renderProcessingTimeChart() - Simple list
│   ├── renderErrorTypesChart() - Bar chart
│   ├── renderErrorMessagesChart() - Bar chart (similar to above)
│   └── renderErrorsByFileChart() - Bar chart (similar to above)
└── Export Methods
    ├── exportCSV() - Incomplete error categorization
    └── exportXML() - Incomplete error categorization
```

## Proposed Architecture

```
StatisticsTab (< 500 lines)
├── State Management (unchanged)
├── Data Layer
│   └── StatsCalculator utility
│       ├── calculateForSingleMod()
│       └── calculateForModCollection()
│       └── (shared aggregation logic)
├── Rendering Layer
│   ├── ChartRenderer utility
│   │   ├── createPieChart(data, colors, labels)
│   │   ├── createBarChart(data, options)
│   │   └── createArcPath(angles, radius, color) [shared]
│   └── Template methods (use ChartRenderer)
│       ├── renderOverviewCards()
│       ├── renderSuccessChart() → ChartRenderer.createPieChart()
│       ├── renderErrorChart() → ChartRenderer.createPieChart()
│       └── renderCategoriesChart() → ChartRenderer.createPieChart()
└── Export Layer
    └── DataExporter utility
        ├── toCSV(stats, mode)
        └── toXML(stats, mode)
        └── (consistent with current error categories)
```

## Key Changes

### 1. Extract Chart Rendering Utilities
Create `chart-utilities.mjs` with reusable chart components:
- `createArcPath()` - Single function for all arc generation
- `createPieChart()` - Generic pie chart builder
- `createBarChart()` - Generic bar chart builder
- Reduces 300+ lines of duplicated SVG/HTML generation to ~100 lines

### 2. Unify Statistics Calculation
Merge `calculateStats()` and `calculateStatsForMod()` into a single function with optional parameters:
- `calculateStatistics(mods, options = {})` where `mods` can be array or single mod
- Removes ~80 lines of duplicate logic
- Easier to maintain consistent calculation rules

### 3. Fix Export Implementations
Update CSV/XML exports to match current error categorization:
- Replace outdated `validationStatus` logic
- Use `mod.errorCategories.validation/analyzer/stderr/other` consistently
- Add missing "Other Errors" column to CSV
- Align XML structure with current UI display

### 4. Separate Concerns with Utilities
Move non-UI logic to separate utility files:
- `statistics-calculator.mjs` - Pure calculation logic
- `chart-utilities.mjs` - Pure SVG/HTML generation
- `data-exporter.mjs` - Pure export formatting
- Main tab file focuses only on state management and template composition

## Benefits

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Pure utility functions can be unit tested independently
3. **Consistency**: Single source of truth for calculations and rendering
4. **Reusability**: Chart utilities could be used by other tabs (e.g., Dependencies tab graphs)
5. **Reduced size**: Statistics tab shrinks from 1,015 lines to ~400-500 lines
6. **Bug fixes**: Export features will correctly reflect current error categorization

## Risks and Mitigations

**Risk**: Breaking existing functionality during refactor
- **Mitigation**: Manual testing with representative mod sets (1 mod, 50 mods, 300+ mods)
- **Mitigation**: Maintain identical output HTML/SVG structure during refactor

**Risk**: Performance regression from additional function calls
- **Mitigation**: Utilities are lightweight data transformations, negligible overhead
- **Mitigation**: Profile before/after with large mod collections

**Risk**: Increased file count complexity
- **Mitigation**: Co-locate utilities in `tabs/utilities/` subfolder
- **Mitigation**: Clear naming and documentation for each utility module

## Out of Scope

- Adding new chart types or visualization features
- Changing the UI/UX design or layout
- Performance optimizations beyond code structure improvements
- Migration to a charting library (maintaining vanilla JS approach)

## Success Criteria

- [ ] Zero regressions in visual output (charts, cards, exports)
- [ ] Statistics tab file reduced to < 500 lines
- [ ] CSV/XML exports correctly include all 4 error categories
- [ ] All `createArc` duplication eliminated
- [ ] Manual testing passes with 1, 50, and 300+ mods
- [ ] No performance degradation (< 5ms difference in render time)
