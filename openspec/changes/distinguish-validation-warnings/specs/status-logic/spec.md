# Mod Validation Status Logic Specification

## MODIFIED Requirements

### Requirement: Mod status reflects validation outcome including warnings
**Description**: Update status assignment logic to introduce new `'success-with-warnings'` status for mods that pass validation but contain non-critical warnings.

#### Scenario: Mods with only warnings get success-with-warnings status
**Given** a mod has no parser errors AND no validation errors AND has warnings  
**When** status is determined  
**Then** `mod.status = 'success-with-warnings'`  
**And** validation result `hasErrors()` returns false (warnings don't fail validation)

#### Scenario: Mods with errors are still failed regardless of warnings
**Given** a mod has parser errors OR validation errors  
**When** status is determined  
**Then** `mod.status = 'failed'` OR `mod.status = 'validation-failed'` (parser errors take precedence)  
**And** any warnings present are not considered in status calculation

#### Scenario: Clean mods without warnings keep success status
**Given** a mod has no parser errors AND no validation errors AND no warnings  
**When** status is determined  
**Then** `mod.status = 'success'`

#### Scenario: Validation warnings don't override validation errors
**Given** a mod has validation rule violations (e.g., invalid name) AND warning-level stderr  
**When** status is determined  
**Then** `mod.status = 'validation-failed'` (validation errors take precedence)  
**And** warnings are recorded but don't affect status

### Requirement: Status calculation uses classified warning/error data
**Description**: Status assignment logic depends on properly classified error vs. warning data from error-classification capability.

#### Scenario: Status logic distinguishes WARN: prefix warnings from ERR: prefix errors
**Given** stderr contains both \"WARN: Missing metadata\" and \"ERR: Syntax error\"  
**When** status is calculated  
**Then** status is 'failed' (because ERR: exists)  
**And** if ERR: is removed, status becomes 'success-with-warnings'

#### Scenario: Status calculation includes all error categories
**Given** a mod has warnings in errorCategories.warnings  
**When** status is determined  
**Then** all error categories are checked: validation, analyzer, stderr, other  
**And** missing or empty categories default to zero count (no errors)

## REMOVED Requirements

### Requirement: Validation failed is only outcome for non-parser-errors
**Rationale**: With new 'success-with-warnings' status, validation-failed only occurs for validation rule violations, not mere warnings.

## Related Capabilities
- **error-classification**: Provides classified warnings vs. errors for status determination
- **statistics-tracking**: Counts mods by status, including new success-with-warnings
- **ui-results-display**: Displays status and whether validation passed
