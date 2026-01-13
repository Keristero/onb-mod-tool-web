# Design Document: Distinguish Validation Warnings

## Problem Statement

Currently, the mod analyzer treats all stdout errors uniformly as critical validation failures. However, many analyzer outputs include both critical errors (prefixed with `ERR:`) and non-critical warnings (prefixed with `WARN:`). The system does not differentiate between these two severity levels, causing mods with only warnings to be marked as failed validation when they should be considered valid with warnings.

This leads to:
- Inaccurate mod validation status (warnings incorrectly trigger "failed" status)
- Loss of actionable information for mod developers (warnings are buried in error lists)
- Incorrect success metrics (mods with warnings don't appear in success statistics)
- No visibility into which mods pass with warnings vs. completely clean mods

## Solution Overview

Introduce a new "validation warning" category distinct from critical errors:
- Detect messages prefixed with `WARN:` in stdout/stderr and categorize them as warnings
- Separate warnings from errors throughout the system (validation, statistics, UI)
- Update mod validation status logic: mods with only warnings should pass validation
- Add new statistics: "Valid mods with warnings %" to track warning prevalence
- Theme warnings with a distinct yellowish-lime green color (between yellow and green)
- Display warnings prominently in results and statistics tabs

## Architectural Changes

### 1. Error Classification (Parser Level)
**Scope**: `parser.mjs::extractErrors()`

Currently extracts all stderr output as errors with binary error/warning classification. New approach:
- Parse prefix: if line starts with `WARN:`, classify as warning
- If line starts with `ERR:` or has no prefix, classify as error
- Warnings stored separately from errors to enable distinct handling

**Reuse**: No new classification functions; update existing prefix-detection logic inline.

### 2. Error Categorization (Main Processing)
**Scope**: `main.mjs` error categorization section

Currently categorizes errors into: validation, analyzer, stderr, other. New approach:
- Add separate categories for warnings: `errorCategories.warnings` (or split existing stderr into `warnings` and `errors`)
- Apply same categorization logic to warnings (validation warnings, stderr warnings, etc.)
- Aggregate warning counts alongside error counts

**Design Decision**: Whether to split `errorCategories.stderr` into `stderr.errors` and `stderr.warnings`, or add new top-level `errorCategories.warnings` category. **Chosen**: Add new top-level `warnings` category to keep structure cleaner and allow warnings from different sources (stderr only in current system, but extensible).

### 3. Validation Status Logic
**Scope**: `main.mjs::setModStatus()`

Current logic:
- If parser error → status = 'failed'
- Else if validation errors → status = 'validation-failed'
- Else → status = 'success'

New logic:
- If parser error → status = 'failed'
- Else if validation errors (excluding warnings) → status = 'validation-failed'
- Else if warnings exist and no errors → status = 'success-with-warnings'
- Else → status = 'success'

This ensures mods with only warnings pass validation while still being visually distinct.

### 4. Statistics Tracking
**Scope**: `statistics-calculator.mjs::calculateStatistics()`

Current statistics:
- successful: mods with status 'success'
- validationFailed: mods with status 'validation-failed'
- failed: mods with status 'failed'

New statistics:
- successWithWarnings: mods with status 'success-with-warnings'
- Add percentage: `validWithWarningsRate = (successful + successWithWarnings) / total * 100`
- Track warnings similar to errors: aggregate by file, by type, most common warning messages
- Separate warning counts: `totalWarnings`, `stderrWarnings`

### 5. UI Theming
**Scope**: `styles.css`

Current colors:
- --error-color: #f44336 (red)
- --warning-color: #ff9800 (orange)
- --success-color: #4CAF50 (green)

New color:
- --validation-warning-color: A yellowish-lime green between yellow and green
- **Candidate colors**:
  - #D4E157 (lighter, more yellow)
  - #CDDC39 (lime with yellow tint)
  - #C0CA33 (medium, balanced yellow-green)
  - #BCD34B (saturated lime-green blend)
  
**Chosen**: #C0CA33 - balances yellow warmth with green association, distinct from orange warning-color and red error-color, accessible for color-blind users.

### 6. Results Tab Display
**Scope**: `results-tab.mjs::renderConsoleOutput()`

Currently displays all errors. New approach:
- Separate console output sections: "Errors" and "Warnings"
- Show warning count in summary
- Render warnings with --validation-warning-color background/border
- Collapse warnings section by default (expandable)

### 7. Statistics Tab Display
**Scope**: `statistics-tab.mjs::renderStats()`

Currently shows error distribution. New approach:
- Add new overview card: "Valid Mods with Warnings %" (only for session view)
- Add expandable "Warnings" section alongside errors
- Track most common warnings per file/mod
- Show warning distribution similar to error distribution

## Implementation Sequencing

Recommended phasing to enable early testing and feedback:

1. **Phase 1** (Core parsing): Update error extraction to detect WARN: prefix
2. **Phase 2** (Categorization): Add warnings category to mod object structure
3. **Phase 3** (Validation logic): Update status calculation to handle success-with-warnings
4. **Phase 4** (Statistics): Update calculation and aggregation for warnings
5. **Phase 5** (UI - Results): Add warning display in results tab
6. **Phase 6** (UI - Statistics): Add warning statistics and metrics
7. **Phase 7** (UI - Styling): Apply yellowish-lime green theme

## Code Reuse Strategy

- **Error categorization logic**: Extract helper function `categorizeErrorOrWarning()` used in both error and warning processing to avoid duplication
- **Statistics aggregation**: Reuse existing message deduplication and occurrence-counting logic for warnings
- **Chart rendering**: Reuse existing bar/pie chart utilities for warning statistics
- **CSS utilities**: Add single color variable `--validation-warning-color`, reuse existing border/background utility classes

## Backward Compatibility

- New `status` value 'success-with-warnings' is non-breaking (code checks status already handles unknown values)
- New statistics fields are additive; existing fields unchanged
- New CSS color is additive; no changes to existing color schemes
- Error structure remains compatible; warnings are additional, not replacing

## Testing Strategy

- Unit tests: Parse WARN: prefix from various stderr formats
- Integration tests: Mods with only warnings should have status 'success-with-warnings'
- UI tests: Visual regression with warning display, color visibility
- End-to-end: Load test mods with warnings, verify statistics and status display
