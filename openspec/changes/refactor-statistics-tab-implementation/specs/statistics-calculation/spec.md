# Statistics Calculation Specification

## MODIFIED Requirements

### Requirement: Statistics calculation must support both single and multiple mods

The system MUST calculate statistics for either a single mod or a collection of mods using a unified calculation function.

*(Modified to unify previously separate `calculateStats()` and `calculateStatsForMod()` functions)*

#### Scenario: Calculate statistics for single mod
**Given** a developer needs to display statistics for one mod  
**When** they call `calculateStatistics(mod)` with a single mod object  
**Then** statistics include success rate, error counts by category, processing time, and mod category  
**And** error counts are sourced from `mod.errorCategories` (validation, analyzer, stderr, other)  
**And** the calculation completes in < 1ms

#### Scenario: Calculate statistics for mod collection
**Given** a developer needs to display aggregated statistics for multiple mods  
**When** they call `calculateStatistics(mods)` with an array of mod objects  
**Then** statistics include total count, success rates, average/min/max processing times  
**And** error counts are aggregated across all mods  
**And** category distribution shows count per mod category  
**And** the calculation completes in < 10ms for 300 mods

#### Scenario: Handle empty mod collection
**Given** no mods have been processed yet  
**When** `calculateStatistics([])` is called with empty array  
**Then** statistics return zero values for all numeric fields  
**And** no division-by-zero errors occur  
**And** success rate is reported as 0%

### Requirement: Error categorization must be sourced from pre-computed mod data

All error counts and categorization MUST use the pre-computed `mod.errorCategories` object established during mod processing.

*(Modified to standardize on single source of truth)*

#### Scenario: Calculate error distribution
**Given** a mod has been processed with error categorization  
**When** statistics are calculated  
**Then** validation errors = `mod.errorCategories.validation.length`  
**And** analyzer errors = `mod.errorCategories.analyzer.length`  
**And** stderr errors = `mod.errorCategories.stderr.length`  
**And** other errors = `mod.errorCategories.other.length`  
**And** no ad-hoc error classification logic is used

#### Scenario: Handle mod with missing error categories
**Given** a mod object lacks the `errorCategories` property  
**When** statistics are calculated  
**Then** error counts default to 0 for all categories  
**And** no errors are thrown  
**And** a warning is logged to the console

## ADDED Requirements

### Requirement: Statistics must include common error message aggregation

The system SHALL track and count the most frequently occurring error messages across mods to identify common issues.

#### Scenario: Aggregate stderr error messages
**Given** multiple mods have been processed with stderr errors  
**When** statistics are calculated  
**Then** a map of unique stderr messages to occurrence counts is generated  
**And** messages are cleaned (whitespace normalized, ANSI codes removed)  
**And** duplicate messages are properly consolidated

#### Scenario: Aggregate validation error messages
**Given** multiple mods have validation errors  
**When** statistics are calculated  
**Then** validation errors are grouped by `${field}: ${message}` format  
**And** identical validation errors across mods are counted together

#### Scenario: Limit error message collection to prevent memory issues
**Given** a large mod collection with many unique error messages  
**When** statistics are calculated  
**Then** only the top 100 most common error messages per category are retained  
**And** less frequent errors are aggregated into "Other" count

## REMOVED Requirements

*None - existing behavior is preserved*
