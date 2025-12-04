# Data Export Specification

## MODIFIED Requirements

### Requirement: CSV exports must include all current error categories

CSV exports MUST accurately reflect all four error categories (validation, analyzer, stderr, other) used in the current UI.

*(Modified to fix outdated export implementation)*

#### Scenario: Export single mod statistics to CSV
**Given** a mod has been analyzed with errors categorized  
**When** the user exports file statistics to CSV  
**Then** the CSV includes columns: Filename, Status, Validation Errors, Analyzer Errors, Stderr Errors, Other Errors  
**And** error counts match the values displayed in the UI  
**And** "Other Errors" column is not missing (previously omitted)

#### Scenario: Export session statistics to CSV
**Given** multiple mods have been analyzed  
**When** the user exports session statistics to CSV  
**Then** each row represents one mod with all error categories  
**And** values are sourced from `mod.errorCategories`  
**And** no ad-hoc error calculations are performed during export

#### Scenario: CSV cells are properly escaped
**Given** a mod filename or error message contains special characters (quotes, commas)  
**When** statistics are exported to CSV  
**Then** all cells are quoted and internal quotes are escaped as ""  
**And** the CSV is parseable by standard CSV libraries

### Requirement: XML exports must match current UI structure

XML exports MUST reflect the current error categorization and UI display logic.

*(Modified to fix outdated export implementation)*

#### Scenario: Export single mod statistics to XML
**Given** a mod has been analyzed  
**When** the user exports file statistics to XML  
**Then** the XML includes `<validationErrors>`, `<analyzerErrors>`, `<stderrErrors>`, `<otherErrors>` elements  
**And** each error category element has a `count` attribute  
**And** error details are nested within the appropriate category element

#### Scenario: Export session statistics to XML
**Given** multiple mods have been analyzed  
**When** the user exports session statistics to XML  
**Then** a `<summary>` element contains aggregated statistics  
**And** a `<mods>` element contains individual `<mod>` entries  
**And** each mod entry includes all four error category counts  
**And** error counts match the session view UI display

#### Scenario: XML special characters are escaped
**Given** mod data contains XML special characters (&, <, >, ", ')  
**When** statistics are exported to XML  
**Then** all text content is properly XML-escaped  
**And** the XML is well-formed and parseable

## ADDED Requirements

### Requirement: Export functions must be pure utilities

Export formatting logic SHALL be extracted to pure utility functions that MUST take data and return formatted strings.

#### Scenario: Generate CSV string from statistics data
**Given** a statistics data object  
**When** `exportToCSV(stats, mods, mode)` is called  
**Then** a CSV string is returned  
**And** no file system operations or DOM manipulation occur  
**And** the function can be tested without a browser environment

#### Scenario: Generate XML string from statistics data
**Given** a statistics data object  
**When** `exportToXML(stats, mods, mode)` is called  
**Then** a valid XML string is returned  
**And** the XML includes a `<?xml version="1.0"?>` declaration  
**And** no file system operations or DOM manipulation occur

## REMOVED Requirements

### Requirement: Exports must calculate `validationStatus` field *(REMOVED)*

**Rationale**: The `validationStatus` field was redundant with `mod.status` and calculated inconsistently. Current UI uses `mod.status` directly, and exports should match.

#### Scenario: *(Previously)* CSV includes validation status column
**Given** a mod has been processed  
**When** CSV is exported  
**Then** a "Validation Status" column shows "Validation Failed", "Failed", or "Success"  
*(Now handled by the existing "Status" column)*

## Implementation Notes

**Breaking Change**: CSV column headers change from old format to new format:
- **Added**: "Other Errors" column
- **Removed**: "Validation Status" column (redundant with "Status")
- **No change**: All other columns remain

This is acceptable because:
1. Exports are one-time downloads, not persistent data
2. No automated systems depend on the CSV format
3. User benefit (accuracy) outweighs minor format change

**Migration**: Update export documentation to reflect new CSV structure.
