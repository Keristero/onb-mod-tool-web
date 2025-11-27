# Statistics Aggregation Specification

## ADDED Requirements

### Requirement: Validation Error Tracking
The system SHALL track web validation errors separately from parser errors in statistics.

#### Scenario: Validation error aggregation
- **WHEN** collecting statistics for analyzed mods
- **THEN** the system SHALL count validation errors separately from parser errors
- **AND** SHALL track which validation rules failed most frequently
- **AND** SHALL maintain counts for each validation error type

#### Scenario: Error type categorization
- **WHEN** aggregating error statistics
- **THEN** the system SHALL categorize errors as either "Parser Errors" or "Web Validation Errors"
- **AND** SHALL count occurrences of each category

### Requirement: Error Type Distribution Chart
The system SHALL display a pie chart showing the distribution of error types (parser vs validation).

#### Scenario: Error type pie chart rendering
- **WHEN** viewing statistics
- **THEN** the system SHALL display a pie chart with two segments
- **AND** one segment SHALL represent parser errors
- **AND** one segment SHALL represent web validation errors
- **AND** SHALL show counts and percentages for each category

#### Scenario: Empty error type chart
- **WHEN** no errors have been recorded
- **THEN** the system SHALL display an empty state message for the error type chart

### Requirement: Three-Tier Success Rate Tracking
The system SHALL track and display statistics using three success states: Success, Validation Failed, and Failed.

#### Scenario: Success rate calculation with three states
- **WHEN** calculating success rate statistics
- **THEN** the system SHALL count mods in each of three states: Success, Validation Failed, Failed
- **AND** SHALL calculate overall parse success rate as (Success + Validation Failed) / Total
- **AND** SHALL calculate validation success rate as Success / Total

#### Scenario: Three-state success rate visualization
- **WHEN** displaying success rate charts
- **THEN** the system SHALL show three segments in the pie chart
- **AND** SHALL use distinct colors for Success (green), Validation Failed (yellow/orange), and Failed (red)
- **AND** SHALL display counts for each state

## MODIFIED Requirements

### Requirement: Statistics Overview Cards
The system SHALL display overview cards with key statistics including validation metrics.

#### Scenario: File view statistics cards
- **WHEN** viewing file statistics
- **THEN** the system SHALL display cards for: Status (Success/Validation Failed/Failed), Processing Time, Total Errors, Parser Errors, Validation Errors, and Category
- **AND** SHALL use appropriate color coding for each status level

#### Scenario: Session view statistics cards
- **WHEN** viewing session statistics
- **THEN** the system SHALL display cards for: Total Analyzed, Parse Success Rate, Validation Success Rate, Successful, Validation Failed, Failed, Avg Processing Time, Total Parser Errors, Total Validation Errors
- **AND** SHALL use appropriate color coding for metrics

### Requirement: CSV Export with Validation Data
The system SHALL include validation status and validation errors in CSV exports.

#### Scenario: CSV export with validation columns
- **WHEN** exporting statistics to CSV
- **THEN** the system SHALL include columns for: Validation Status, Parser Errors, Validation Errors, and Validation Error Details
- **AND** SHALL properly escape validation error messages

### Requirement: XML Export with Validation Data
The system SHALL include validation status and validation errors in XML exports.

#### Scenario: XML export with validation elements
- **WHEN** exporting statistics to XML
- **THEN** the system SHALL include elements for validation status, parser errors, and validation errors
- **AND** SHALL nest validation error details within a `<validationErrors>` element
- **AND** SHALL properly escape XML special characters in error messages
