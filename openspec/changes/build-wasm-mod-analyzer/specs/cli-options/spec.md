## ADDED Requirements

### Requirement: Dynamic CLI Option Discovery
The system SHALL discover available command-line options by parsing the WASM module's --help output.

#### Scenario: Options enumeration
- **WHEN** the WASM module is first loaded
- **THEN** the system calls it with --help flag
- **AND** parses the output to extract option names, short flags, descriptions, and default values
- **AND** stores the discovered options for UI generation

#### Scenario: Option metadata extraction
- **WHEN** parsing --help output
- **THEN** each option's data type is inferred (flag, string, number)
- **AND** required vs optional status is detected
- **AND** value constraints are extracted (e.g., file extensions, enums)

### Requirement: Dynamic UI Control Generation
The system SHALL generate appropriate UI controls for each discovered CLI option.

#### Scenario: Control type selection
- **WHEN** an option is a boolean flag
- **THEN** a checkbox is generated
- **AND** when an option takes a string value, a text input is created
- **AND** when an option has a limited set of values, a dropdown is created

#### Scenario: Control labeling
- **WHEN** UI controls are generated
- **THEN** labels show the option name and description
- **AND** short flags are displayed as hints
- **AND** default values are pre-filled

#### Scenario: Validation feedback
- **WHEN** a user enters an invalid value
- **THEN** immediate validation feedback is shown
- **AND** error messages explain constraints
- **AND** submission is blocked until valid

### Requirement: STDOUT Handling
The system SHALL capture and display STDOUT output alongside JSON results.

#### Scenario: Combined output display
- **WHEN** the WASM module produces STDOUT text
- **THEN** it is displayed in a separate "Console Output" section
- **AND** JSON results are parsed and displayed in the structured view
- **AND** both are accessible simultaneously

#### Scenario: STDOUT-only mode
- **WHEN** a CLI option disables JSON output
- **THEN** only STDOUT is displayed
- **AND** the JSON tree view is hidden
- **AND** raw text output is shown with proper formatting

### Requirement: Option Persistence
The system SHALL remember user-selected CLI options across sessions using localStorage.

#### Scenario: Save preferences
- **WHEN** a user changes CLI option values
- **THEN** the changes are automatically saved to localStorage
- **AND** apply to future analyses
- **AND** can be reset to defaults

#### Scenario: Restore preferences
- **WHEN** the page is reloaded
- **THEN** previously selected options are restored
- **AND** the UI controls reflect saved values
- **AND** per-version option sets are maintained separately
