## ADDED Requirements

### Requirement: Search tab with subtabs
The system SHALL provide a top-level Search tab with Current File and Session subtabs, following the same subtab pattern as the Statistics and Dependencies tabs.

#### Scenario: Tab is visible in the tab bar
- **WHEN** the page loads
- **THEN** a "Search" button appears in the main tab bar alongside Results, File Browser, Statistics, and Dependencies

#### Scenario: Subtabs are present
- **WHEN** the user activates the Search tab
- **THEN** Current File and Session subtab buttons are displayed
- **AND** Current File is the default active subtab

### Requirement: Search input and submission
The system SHALL provide a text input field and a submit mechanism within the Search tab for entering search queries.

#### Scenario: Submit via button
- **WHEN** the user types a query and clicks the search button
- **THEN** a search is initiated against the target mod(s)

#### Scenario: Submit via Enter key
- **WHEN** the user types a query and presses Enter
- **THEN** a search is initiated against the target mod(s)

#### Scenario: Empty query rejected
- **WHEN** the user submits an empty or whitespace-only query
- **THEN** no search is initiated

### Requirement: Current File search scope
The system SHALL search only the currently selected mod when the Current File subtab is active.

#### Scenario: Single mod searched
- **WHEN** the user submits a query on the Current File subtab
- **THEN** only the files inside the currently selected mod's zip archive are searched

#### Scenario: No mod selected
- **WHEN** the user submits a query on the Current File subtab with no mod selected
- **THEN** a message indicates that no mod is selected

### Requirement: Session search scope
The system SHALL search all mods loaded in the current session when the Session subtab is active.

#### Scenario: All session mods searched
- **WHEN** the user submits a query on the Session subtab with multiple mods loaded
- **THEN** every mod in the session is searched for the query string

### Requirement: Text-file-only search
The system SHALL only search files with known text extensions (`.lua`, `.toml`, `.txt`, `.json`, `.xml`, `.md`, `.cfg`, `.ini`, `.csv`, `.tsv`) or no extension, skipping binary files.

#### Scenario: Binary files skipped
- **WHEN** searching a mod that contains `.png`, `.ogg`, and `.lua` files
- **THEN** only the `.lua` file content is searched

### Requirement: Case-insensitive matching
The system SHALL perform case-insensitive string matching by default.

#### Scenario: Mixed-case match
- **WHEN** the user searches for "battle"
- **AND** a file contains the text "Battle_Init"
- **THEN** the line containing "Battle_Init" is returned as a match

### Requirement: Streaming results display
The system SHALL display search results progressively as each mod finishes scanning, rather than waiting for all mods to complete.

#### Scenario: Progressive rendering
- **WHEN** a session search is running across 100 mods
- **THEN** results for completed mods appear in the results area while remaining mods are still being scanned

### Requirement: Results grouped by mod
The system SHALL group search results by mod, displaying the mod name as a group header.

#### Scenario: Multi-mod grouping
- **WHEN** a session search finds matches in 3 different mods
- **THEN** results are displayed in 3 groups, each headed by the mod name

### Requirement: Context lines in results
The system SHALL display each matching line along with one line of context above and one line below.

#### Scenario: Match with surrounding context
- **WHEN** a match is found on line 5 of a file
- **THEN** lines 4, 5, and 6 are displayed, with line 5 visually highlighted as the match

#### Scenario: Match on first line
- **WHEN** a match is found on line 1
- **THEN** lines 1 and 2 are displayed (no line above)

### Requirement: Mod selection from results
The system SHALL allow users to click a mod name in the search results to select that mod in the analyzer.

#### Scenario: Click mod to select
- **WHEN** the user clicks a mod name header in the search results
- **THEN** that mod becomes the currently selected mod across all tabs

### Requirement: Search summary statistics
The system SHALL display a summary bar showing the number of files searched, matches found, and mods with matches.

#### Scenario: Summary after search
- **WHEN** a search completes
- **THEN** the summary displays "Searched X files, found Y matches across Z mods"

#### Scenario: Summary during search
- **WHEN** a search is in progress
- **THEN** the summary updates progressively as mods are scanned

### Requirement: Search cancellation
The system SHALL cancel any in-progress search when a new search is submitted.

#### Scenario: New search cancels previous
- **WHEN** the user submits a new query while a previous search is still running
- **THEN** the previous search stops producing results
- **AND** the new search begins immediately

### Requirement: UI responsiveness during search
The system SHALL remain responsive during search by yielding to the event loop periodically, ensuring the UI does not freeze even when scanning 2000+ mods.

#### Scenario: Large session search
- **WHEN** searching across 2000 mods, each containing 10 text files
- **THEN** the UI remains interactive (buttons clickable, tabs switchable) throughout the search
