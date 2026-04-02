# Results Display Specification

## ADDED Requirements

### Requirement: Field Validation
The system SHALL validate each summary field value and record validation errors when validation fails.

#### Scenario: Name field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `name` is not null, 'none', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: ID field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `id` is not null, 'none', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: UUID field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `uuid` is not null, 'none', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: Game field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `game` is not null, 'none', 'unknown', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: Version field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `version` is not null, 'none', '0.0.0', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: Category field validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that `category` is not null, 'none', 'unknown', empty string, or undefined
- **AND** SHALL record a validation error if validation fails

#### Scenario: Error count validation
- **WHEN** a mod is analyzed
- **THEN** the system SHALL validate that error count equals 0
- **AND** SHALL record a validation error if error count is greater than 0

### Requirement: Three-Tier Success States
The system SHALL determine mod analysis success using three distinct states: Success, Validation Failed, and Failed.

#### Scenario: Success state determination
- **WHEN** a mod is analyzed
- **AND** category is not 'err'
- **AND** no validation errors exist
- **THEN** the system SHALL mark the result as "Success"

#### Scenario: Validation Failed state determination
- **WHEN** a mod is analyzed
- **AND** category is not 'err'
- **AND** one or more validation errors exist
- **THEN** the system SHALL mark the result as "Validation Failed"

#### Scenario: Failed state determination
- **WHEN** a mod is analyzed
- **AND** category is 'err'
- **THEN** the system SHALL mark the result as "Failed"

### Requirement: Stdout Display
The system SHALL display stdout from the analyzer alongside stderr in the console output section.

#### Scenario: Stdout rendering
- **WHEN** stdout is available in analysis results
- **THEN** the system SHALL display stdout in a separate block
- **AND** SHALL place it above the stderr output
- **AND** SHALL apply the same syntax highlighting as stderr

#### Scenario: Empty stdout handling
- **WHEN** stdout is empty or undefined
- **THEN** the system SHALL not render the stdout block

### Requirement: Validation Error Display
The system SHALL display validation errors in the summary section with clear indication of which fields failed validation.

#### Scenario: Validation error visualization
- **WHEN** validation errors exist
- **THEN** the system SHALL display a validation errors section
- **AND** SHALL list each failed field with its validation message
- **AND** SHALL use distinct visual styling from parser errors

#### Scenario: Field highlighting on validation failure
- **WHEN** a summary field fails validation
- **THEN** the system SHALL apply error styling to that field
- **AND** SHALL display a tooltip explaining the validation requirement

## MODIFIED Requirements

### Requirement: Summary Field Display
The system SHALL display summary fields for analyzed mods, excluding the path field.

#### Scenario: Summary field rendering
- **WHEN** a mod is analyzed
- **THEN** the system SHALL display: Name, ID, UUID, Game, Version, Category, Size, Processing Time, Errors, and Warnings
- **AND** SHALL NOT display the Path field
- **AND** SHALL apply validation styling to fields that fail validation
