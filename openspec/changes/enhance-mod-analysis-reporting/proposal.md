# Change: Enhance Mod Analysis Reporting

## Why
The current mod analysis reporting system lacks proper validation and doesn't distinguish between different types of failures. We need to:
- Validate that critical mod metadata fields (Name, ID, UUID, Game, Version, Category) are present and non-empty
- Display stdout alongside stderr for complete program output
- Introduce three-tier success states (Success, Validation Failed, Failed) to differentiate parsing success with validation issues from complete failures
- Track and visualize web validation errors separately from parser errors in statistics

This will improve user feedback, help mod creators identify issues faster, and provide better analytics about common validation problems.

## What Changes
- Add validation functions for each summary field displayed in results tab
- Record "web validation errors" when validation fails (distinct from parser errors)
- Display stdout from the analyzer alongside existing stderr console output
- Remove Path field from summary display (not needed)
- Introduce three success states:
  1. **Success**: Parsing succeeded, all validations passed
  2. **Validation Failed**: Parsing succeeded but web validation errors exist
  3. **Failed**: Parser returned error category
- Add new pie chart to statistics screen showing error type aggregations (parser errors vs web validation errors)
- Update statistics screen displays to support three-tier success states
- Update session statistics to track validation failures separately from complete failures

## Impact
- Affected specs: `results-display`, `statistics-aggregation`
- Affected code:
  - `src/web/js/tabs/results-tab.mjs`: Update summary rendering, add validation logic
  - `src/web/js/tabs/statistics-tab.mjs`: Add validation error tracking, update charts
  - `src/web/js/parser.mjs`: Add validation utility functions
- Backward compatibility: Changes are additive, existing error tracking continues to work
