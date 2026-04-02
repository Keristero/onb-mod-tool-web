# Statistics Tracking Specification

## ADDED Requirements

### Requirement: Track mods with warnings in statistics
**Description**: Extend statistics calculation to separately count mods by their warning status and aggregate warning information.

#### Scenario: Count successful mods with warnings
**Given** a collection of mods where some have status 'success-with-warnings'  
**When** `calculateStatistics(mods)` is called  
**Then** `stats.successWithWarnings` = count of mods with status 'success-with-warnings'  
**And** `stats.successWithWarnings` is distinct from `stats.successful`

#### Scenario: Calculate valid-with-warnings percentage
**Given** 100 total mods: 60 success, 25 success-with-warnings, 15 failed  
**When** statistics are calculated  
**Then** `stats.validWithWarningsRate = (60 + 25) / 100 * 100 = 85.0%`  
**And** percentage is formatted to one decimal place

#### Scenario: Aggregate warning messages
**Given** multiple mods each with several warning messages  
**When** statistics are calculated  
**Then** `stats.warningMessages` is an object with messages as keys and occurrence counts as values  
**And** most common warnings appear first in sorted order  
**And** message count is limited to top 100 by occurrence (to prevent memory bloat)

#### Scenario: Count warnings by type
**Given** mods with warnings from different categories (e.g., stderr warnings)  
**When** statistics are calculated  
**Then** `stats.warningTypes` breaks down by category (e.g., \"Warnings\": count)  
**And** matches structure of existing `errorTypes` for consistency

#### Scenario: Separate file-level warning tracking
**Given** session statistics with warnings across multiple mods  
**When** statistics are calculated  
**Then** `stats.warningsByFile[fileName]` contains count of warnings per mod  
**And** same structure and deduplication logic as existing errorsByFile

### Requirement: Statistics for both single mod and session aggregation
**Description**: Warning statistics are calculated consistently whether for single mod (file view) or multiple mods (session view).

#### Scenario: Single mod warning statistics
**Given** a single mod is passed to `calculateStatistics(mod)`  
**When** statistics are calculated  
**Then** `stats.warningTypes`, `stats.warningMessages`, `stats.warningsByFile` are all populated  
**And** counts match the single mod's warning arrays exactly

#### Scenario: Session warning aggregation
**Given** multiple mods with varying warning counts  
**When** `calculateStatistics(modArray)` is called with array  
**Then** warning statistics are aggregated across all mods  
**And** total warning count = sum of all mod warnings  
**And** calculation completes in < 10ms for 300 mods

### Requirement: Validate warnings don't count as errors in statistics
**Description**: Warnings are tracked separately in statistics; they do not inflate error counts.

#### Scenario: Error and warning counts are independent
**Given** a mod with 3 errors and 5 warnings  
**When** statistics are calculated  
**Then** `stats.totalErrors` counts only errors (doesn't include warnings)  
**And** `stats.totalWarnings` counts only warnings (doesn't include errors)  
**And** `stats.totalWarnings` is a new field added for warning tracking

#### Scenario: Success rate calculation excludes warnings from failure criteria
**Given** mods with warnings only (no errors)  
**When** success rate is calculated  
**Then** these mods contribute to success/validWithWarningsRate  
**And** do not reduce successRate  
**And** formula: `successRate = (successful + successWithWarnings) / total * 100`

## Related Capabilities
- **status-logic**: Provides status values that statistics uses for counting
- **error-classification**: Provides warning arrays that statistics aggregates
- **ui-statistics-display**: Displays these statistics in UI
