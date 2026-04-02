# Error Classification Specification

## ADDED Requirements

### Requirement: Detect and classify warning-prefixed output lines
**Description**: Parse stderr output to distinguish warning lines (prefixed with `WARN:`) from error lines (prefixed with `ERR:` or no prefix).

#### Scenario: Parse WARN: prefixed line as warning
**Given** stderr contains a line "WARN: Missing optional field"  
**When** `extractErrors(stderr)` is called  
**Then** the line is classified with type 'warning'  
**And** the message is stored as "Missing optional field" (with WARN: prefix removed)

#### Scenario: Parse ERR: prefixed line as error
**Given** stderr contains a line "ERR: Fatal compilation error"  
**When** `extractErrors(stderr)` is called  
**Then** the line is classified with type 'error'  
**And** the message is stored as "Fatal compilation error" (with ERR: prefix removed)

#### Scenario: Parse unprefixed line as error
**Given** stderr contains a line \"[10:5] Unknown token found\"  
**When** `extractErrors(stderr)` is called  
**Then** the line is classified with type 'error'  
**And** the message is preserved as-is

#### Scenario: Ignore context lines
**Given** stderr contains indented context lines (\"  ...\")  
**When** `extractErrors(stderr)` is called  
**Then** context lines are skipped and not included in warnings or errors

### Requirement: Store warnings separately from errors in mod object
**Description**: Add `errorCategories.warnings` array to mod object for non-critical warnings, maintaining separate structure from errors.

#### Scenario: Populate warnings category for stderr warnings
**Given** a mod has stderr output with WARN: prefixed lines  
**When** error categorization processes the mod  
**Then** `mod.errorCategories.warnings` array contains objects with message and type fields  
**And** `mod.errorCategories.warnings` is distinct from `mod.errorCategories.stderr` errors  
**And** warning count is accessible via `mod.errorCategories.warnings.length`

#### Scenario: Handle mod with both errors and warnings
**Given** a mod has stderr with both ERR: and WARN: lines  
**When** error categorization processes the mod  
**Then** `mod.errorCategories.stderr` contains only error lines  
**And** `mod.errorCategories.warnings` contains only warning lines  
**And** counts are correctly summed: errors + warnings = total stderr issues

#### Scenario: Preserve warning metadata
**Given** a warning line contains file/line information  
**When** warning is stored  
**Then** the warning object preserves the full message for context  
**And** file/line extraction logic can optionally parse location data

### Requirement: Maintain backward compatibility with existing error extraction
**Description**: Updates to error classification do not break existing error detection or modify error structure for non-warning errors.

#### Scenario: Existing error types unchanged
**Given** existing error types (validation, analyzer, other)  
**When** code processes mods without warnings  
**Then** error categorization behaves identically to before  
**And** no performance regression (< 1ms overhead for stderr processing)

#### Scenario: Mixed warning/error parsing completes without error
**Given** stderr with complex mix of WARN:, ERR:, and location-based errors  
**When** `extractErrors(stderr)` processes the output  
**Then** no exceptions are thrown  
**And** all lines are correctly classified or skipped

## Related Capabilities
- **status-logic**: Uses classified warnings to determine 'success-with-warnings' status
- **statistics-tracking**: Aggregates warnings classified by this capability
- **ui-results-display**: Displays warnings classified and stored here
