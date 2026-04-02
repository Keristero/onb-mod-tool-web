# Validation System Specification

## ADDED Requirements

### Requirement: Validation Node Interface

The system SHALL provide a `ValidationNode` class that encapsulates a single validation check.

#### Scenario: Create validation node
- **GIVEN** a validation check is needed for a mod field
- **WHEN** a ValidationNode is instantiated with id, name, field, severity, and check function
- **THEN** the node SHALL store these properties
- **AND** SHALL provide a `validate(mod)` method that returns an issue object or null

#### Scenario: Execute validation check
- **GIVEN** a ValidationNode with a check function
- **WHEN** `validate(mod)` is called with a mod object
- **THEN** the check function SHALL be executed with the mod
- **AND** IF the check returns an issue
- **THEN** the node SHALL return an issue object with nodeId, name, field, severity, message, and value
- **AND** IF the check returns null
- **THEN** the node SHALL return null

### Requirement: Validation Registry

The system SHALL provide a `ValidationRegistry` class that manages multiple validation nodes and orchestrates validation.

#### Scenario: Register validation node
- **GIVEN** a ValidationRegistry instance
- **WHEN** `register(node)` is called with a ValidationNode
- **THEN** the node SHALL be added to the registry
- **AND** SHALL return the registry for method chaining

#### Scenario: Validate mod with multiple nodes
- **GIVEN** a ValidationRegistry with registered nodes
- **WHEN** `validate(mod)` is called with a mod object
- **THEN** all registered nodes SHALL be executed in registration order
- **AND** SHALL collect all non-null issues
- **AND** SHALL return a ValidationResult containing all issues

### Requirement: Validation Result Structure

The system SHALL provide a `ValidationResult` class that structures validation output for easy consumption.

#### Scenario: Index issues by field
- **GIVEN** a ValidationResult with multiple issues
- **WHEN** accessing `byField` property
- **THEN** SHALL provide a Map indexed by field name
- **AND** each field SHALL map to an array of issues for that field

#### Scenario: Index issues by severity
- **GIVEN** a ValidationResult with issues of different severities
- **WHEN** accessing `bySeverity` property
- **THEN** SHALL provide an object with `error`, `warning`, and `info` arrays
- **AND** each array SHALL contain only issues of that severity

#### Scenario: Quick error counts
- **GIVEN** a ValidationResult
- **WHEN** accessing `counts` property
- **THEN** SHALL provide an object with `total`, `errors`, `warnings`, and `info` counts
- **AND** SHALL provide `hasErrors()` method returning true if any error-level issues exist
- **AND** SHALL provide `hasIssues()` method returning true if any issues exist

### Requirement: Built-in Field Validators

The system SHALL provide built-in validation nodes for standard mod fields.

#### Scenario: Validate required text fields
- **GIVEN** a mod with parsed data
- **WHEN** validation is run
- **THEN** SHALL check `name`, `id`, `uuid`, `game` fields are not empty or 'unknown'
- **AND** SHALL create error-level issues for invalid values

#### Scenario: Validate version field
- **GIVEN** a mod with parsed data
- **WHEN** validation is run
- **THEN** SHALL check `version` field is not '0.0.0' or invalid
- **AND** SHALL create error-level issue if invalid

#### Scenario: Validate category field
- **GIVEN** a mod with parsed data
- **WHEN** validation is run
- **THEN** SHALL check `category` field is not 'err' or 'unknown'
- **AND** SHALL create error-level issue if invalid

### Requirement: Parser Error Counting

The system SHALL accurately count parser errors from mod data.

#### Scenario: Count parser errors from ErrorManager
- **GIVEN** a mod with `errorsByFile` Map populated by ErrorManager
- **WHEN** parser errors validation node runs
- **THEN** SHALL iterate all error arrays in the Map
- **AND** SHALL sum the total count of errors
- **AND** IF count > 0, SHALL create error-level issue with message "Mod has {count} parser error(s) that must be resolved"
- **AND** SHALL include the count as the issue value

#### Scenario: No parser errors
- **GIVEN** a mod with empty `errorsByFile` Map
- **WHEN** parser errors validation node runs
- **THEN** SHALL return null (no issue)

### Requirement: Analyzer Failure Detection

The system SHALL detect analyzer-level failures.

#### Scenario: Analyzer error result
- **GIVEN** a mod where `result.success === false` and `result.error` is present
- **WHEN** analyzer validation node runs
- **THEN** SHALL create error-level issue with message "Analyzer error: {result.error}"

#### Scenario: Category error detection
- **GIVEN** a mod where `parsed.category === 'err'`
- **WHEN** analyzer validation node runs
- **THEN** SHALL create error-level issue with message "Parser failure - mod category is 'err'"

### Requirement: Validation Integration

The system SHALL integrate validation into mod processing as a single pass.

#### Scenario: Run validation during mod load
- **GIVEN** a mod has been processed and data populated
- **WHEN** mod processing completes in `main.mjs`
- **THEN** `validationRegistry.validate(modData)` SHALL be called
- **AND** result SHALL be stored as `modData.validationResult`

#### Scenario: Derive mod status from validation
- **GIVEN** a mod with validation results
- **WHEN** determining mod status
- **THEN** IF validation has analyzer field issues, status SHALL be 'failed'
- **AND** IF validation has any error-level issues, status SHALL be 'validation-failed'
- **AND** OTHERWISE status SHALL be 'success'

#### Scenario: Backward compatibility
- **GIVEN** a mod with validation results
- **WHEN** mod processing completes
- **THEN** SHALL populate `modData.validationErrors` with error-level issues
- **AND** SHALL populate `modData.errorCategories` derived from validation result
- **AND** existing code using these properties SHALL continue to work

### Requirement: UI Consumption of Validation Results

The system SHALL enable UI components to consume validation results consistently.

#### Scenario: Display validation issues in Results tab
- **GIVEN** a mod with validation results
- **WHEN** Results tab renders mod summary
- **THEN** SHALL use `mod.validationResult.issues` as the source
- **AND** SHALL display error count from `mod.validationResult.counts.errors`
- **AND** parser error count SHALL match the value in the "errors" field issue

#### Scenario: Aggregate statistics from validation
- **GIVEN** multiple mods with validation results
- **WHEN** Statistics tab calculates metrics
- **THEN** SHALL use `mod.validationResult` as the source for all error counts
- **AND** SHALL eliminate duplicate error counting logic
- **AND** error statistics SHALL be consistent across all displays

## MODIFIED Requirements

None - this is a new system

## REMOVED Requirements

None - existing validation code will be deprecated gradually
