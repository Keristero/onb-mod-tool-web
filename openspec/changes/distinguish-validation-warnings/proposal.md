# Proposal: Distinguish Validation Warnings from Errors

## Executive Summary

Add support for **validation warnings** as a distinct, non-critical error category in the mod analyzer. Warnings (prefixed with `WARN:` in stdout) should not cause mod validation to fail, and should be tracked separately in statistics with new metrics like "Valid Mods with Warnings %". This improves accuracy of validation status and provides developers with actionable feedback.

## Current State

The analyzer currently treats all stdout output uniformly:
- Any non-empty stderr line is flagged as an error
- Lines with `WARN:` prefix exist but are not distinguished from `ERR:` prefix
- Mods with warnings-only are marked as "validation-failed"
- No statistics differentiate warning-only mods from error-free mods

## Proposed Changes

### 1. Error Detection and Classification
**What**: Update error parsing to distinguish `WARN:` and `ERR:` prefixes
- Extract stderr errors with type detection: if line starts with `WARN:`, mark as warning; otherwise mark as error
- Store warnings in separate category: `errorCategories.warnings`

### 2. Mod Validation Status
**What**: Add new status value for mods with only warnings
- New status: `'success-with-warnings'` for mods that pass validation but have warnings
- Logic: Parser errors → 'failed', validation errors → 'validation-failed', warnings only → 'success-with-warnings', clean → 'success'

### 3. Statistics and Metrics
**What**: Track warnings separately and add new metrics
- Count mods with warnings: `successWithWarnings`
- New percentage: "Valid Mods with Warnings %" = (clean + warning-only) / total * 100
- Separate warning lists in session and file statistics
- Aggregate most common warnings per mod

### 4. User Interface - Results Tab
**What**: Display warnings prominently in mod analysis results
- Add expandable "Warnings" section in console output
- Apply distinctive yellowish-lime green theme (#C0CA33)
- Show warning count in summary, validation status unchanged (still passes)

### 5. User Interface - Statistics Tab
**What**: Add warning metrics to session and file statistics
- New overview card: "Valid Mods with Warnings %" (session view only)
- Separate "Warnings" section showing most common warning messages
- Include warnings in error distribution charts

### 6. Visual Styling
**What**: Add new color theme for validation warnings
- New CSS variable: `--validation-warning-color: #C0CA33`
- Color choice: yellowish-lime green, accessible, distinct from existing colors
- Applied to warning borders, backgrounds, status indicators

## Benefits

1. **Accuracy**: Mods with only warnings now correctly show as "passed validation" instead of "failed"
2. **Developer UX**: Warnings are visually distinct and grouped separately for quick review
3. **Metrics**: New statistic reveals prevalence of warnings across mod suite
4. **Extensibility**: Foundation for future severities (info, deprecation, etc.)
5. **Maintainability**: Separate categorization enables future rules for what counts as warning vs. error

## Scope and Scale

**Files affected**: 
- `parser.mjs` - error extraction logic
- `main.mjs` - error categorization and status assignment
- `statistics-calculator.mjs` - warning aggregation
- `results-tab.mjs` - warning display
- `statistics-tab.mjs` - warning statistics
- `styles.css` - warning color theme
- `constants.mjs` - add color constant

**Estimated complexity**: Medium
- Non-breaking changes; all new fields and status values are additive
- Reuses existing error handling patterns
- No changes to WASM interface or analyzer output format

## Trade-offs and Decisions

1. **Separate vs. Mixed Categories**: Chose to add separate `warnings` category instead of splitting `stderr` into `errors` and `warnings` for cleaner structure and future extensibility

2. **Color Choice**: Selected yellowish-lime green (#C0CA33) over other options for balance between yellow (neutral/caution) and green (informational), ensuring accessibility

3. **Status Value**: Created new `'success-with-warnings'` status instead of using validation-failed for clarity and future metrics

4. **Statistics Inclusion**: Warnings count toward "valid" mods (clean + warning-only) to reflect actual validation passing status

## Validation Criteria

- [ ] Mods with only warnings (no errors) have status 'success-with-warnings'
- [ ] Mods with only warnings appear in "Valid Mods with Warnings %" metric
- [ ] Warnings are displayed in results tab with correct color theming
- [ ] Session statistics show separate warning aggregations
- [ ] All existing error handling remains unchanged and backward compatible
- [ ] New features do not impact performance (< 1ms overhead for statistics)

## Next Steps

1. Create detailed specification deltas for each capability
2. Break down into small, verifiable implementation tasks
3. Review with team for approval
4. Implement in phases, starting with core parsing logic
5. Test against sample mod files with warnings
6. Deploy and monitor for any regression

## Questions for Reviewers

1. Is yellowish-lime green (#C0CA33) the preferred color, or should we explore other options?
2. Should warnings from validation rules (e.g., missing metadata) be treated the same as analyzer warnings?
3. Should the new "success-with-warnings" status trigger any UI warnings or notifications?
