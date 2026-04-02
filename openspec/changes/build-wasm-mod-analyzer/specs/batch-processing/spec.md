## ADDED Requirements

### Requirement: Multi-File Selection
The system SHALL support selecting and processing multiple mod files simultaneously via file picker or drag-and-drop.

#### Scenario: Multiple file selection
- **WHEN** a user opens the file picker
- **THEN** multiple files can be selected using Ctrl+Click or Shift+Click
- **AND** all selected files are queued for processing
- **AND** a count of selected files is displayed

#### Scenario: Batch drag-and-drop
- **WHEN** a user drags multiple files onto the drop zone
- **THEN** all .zip files are accepted and queued
- **AND** non-.zip files are rejected with a notification
- **AND** the queue shows all pending files

### Requirement: Processing Queue
The system SHALL process multiple files sequentially with progress indication and result storage.

#### Scenario: Queue processing
- **WHEN** multiple files are queued
- **THEN** they are processed one at a time in order
- **AND** a progress bar shows overall completion
- **AND** the current file being processed is highlighted

#### Scenario: Individual file status
- **WHEN** a file is being processed
- **THEN** its status shows as "Processing"
- **AND** when complete, status changes to "Success" or "Failed"
- **AND** processing time is recorded and displayed

#### Scenario: Result accumulation
- **WHEN** files are processed
- **THEN** all results are stored in memory
- **AND** they remain accessible for statistics and comparison
- **AND** results can be cleared manually by the user

### Requirement: Error Resilience
The system SHALL continue processing remaining files even if individual files fail.

#### Scenario: Partial failure
- **WHEN** one file fails during batch processing
- **THEN** the error is logged and displayed
- **AND** the next file in the queue starts processing
- **AND** the failed file does not block the queue

#### Scenario: Error summary
- **WHEN** batch processing completes
- **THEN** a summary shows total files, successes, and failures
- **AND** failed files are highlighted in the list
- **AND** users can retry failed files individually

### Requirement: Mod History List
The system SHALL maintain a persistent list of processed mods that allows viewing previous results and serves as a batch processing progress display.

#### Scenario: Processed mod list display
- **WHEN** a mod file is processed
- **THEN** it appears in a persistent mod history list
- **AND** the list shows mod filename, status (processing/success/failed), and timestamp
- **AND** the list remains visible across tab switches
- **AND** the most recent mod is added to the top of the list

#### Scenario: View previous results
- **WHEN** a user clicks on a mod in the history list
- **THEN** that mod's analysis results are displayed in all tabs
- **AND** the selected mod is visually highlighted in the list
- **AND** all tabs update via onFileProcessed(result)

#### Scenario: Name-based filtering
- **WHEN** a user types in the mod list filter box
- **THEN** the list filters to show only mods whose filenames contain the search text
- **AND** filtering is case-insensitive
- **AND** the filter updates in real-time as the user types
- **AND** clearing the filter shows all mods again
