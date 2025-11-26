## ADDED Requirements

### Requirement: Per-File Metrics Collection
The system SHALL track comprehensive metrics for each analyzed mod file.

#### Scenario: Success metrics
- **WHEN** a mod file is successfully analyzed
- **THEN** metrics include: filename, processing time, file size, number of errors, number of warnings, mod type, package ID
- **AND** metrics are stored with timestamp
- **AND** metrics persist in browser localStorage

#### Scenario: Failure metrics
- **WHEN** a mod file fails to analyze
- **THEN** metrics include: filename, error type, error message, timestamp
- **AND** partial results are saved if available
- **AND** failure reason is categorized (parse error, invalid format, timeout)

### Requirement: Aggregated Statistics Dashboard
The system SHALL provide a Statistics tab displaying aggregated data across all processed files.

#### Scenario: Success rate visualization
- **WHEN** the Statistics tab is opened
- **THEN** a chart shows percentage of successful vs failed analyses
- **AND** a total file count is displayed prominently
- **AND** historical data shows trends over time

#### Scenario: Most common errors
- **WHEN** errors have been encountered
- **THEN** a ranked list shows error types by frequency
- **AND** each error type shows count and percentage
- **AND** clicking an error filters the file list to show affected files

#### Scenario: Error frequency by file
- **WHEN** multiple files have been processed
- **THEN** a bar chart shows files sorted by error count
- **AND** error types are color-coded within each bar
- **AND** hovering shows detailed breakdown

#### Scenario: Performance metrics
- **WHEN** processing times are recorded
- **THEN** statistics show average, min, max processing time
- **AND** a distribution chart shows processing time ranges
- **AND** outliers are identified

### Requirement: XML Statistics Export
The system SHALL export all collected statistics to XML format for external analysis.

#### Scenario: Export all statistics
- **WHEN** the user clicks "Export Statistics"
- **THEN** an XML file is generated containing all per-file metrics and aggregated data
- **AND** the file is downloaded with timestamp in filename
- **AND** XML structure includes: summary, per-file details, error catalog, processing metadata

#### Scenario: XML schema compliance
- **WHEN** XML is exported
- **THEN** it follows a documented schema
- **AND** includes xmlns and version attributes
- **AND** is parseable by standard XML tools

### Requirement: Persistent Storage
The system SHALL persist statistics across browser sessions using localStorage.

#### Scenario: Data persistence
- **WHEN** the browser is closed and reopened
- **THEN** previously collected statistics are restored
- **AND** the dashboard shows historical data
- **AND** users can choose to clear stored data

#### Scenario: Storage limits
- **WHEN** localStorage approaches quota limits
- **THEN** the user is warned
- **AND** old data can be selectively deleted
- **AND** export is suggested before clearing
