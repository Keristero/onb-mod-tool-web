## ADDED Requirements

### Requirement: File Browser with Zip Extraction
The system SHALL extract and display the contents of analyzed mod zip files using JSZip.

#### Scenario: File tree display
- **WHEN** a mod file is analyzed
- **THEN** a file browser shows the complete directory structure
- **AND** folders are displayed hierarchically with expand/collapse controls
- **AND** file icons indicate file types (lua, png, txt, etc.)

#### Scenario: File selection
- **WHEN** a user clicks a file in the browser
- **THEN** the file contents are displayed in the preview pane
- **AND** the selected file is highlighted
- **AND** images are rendered, text files show syntax highlighting

### Requirement: Syntax Highlighting with Line Numbers
The system SHALL display text files with syntax-highlighted code and line numbers.

#### Scenario: Lua file display
- **WHEN** a .lua file is selected
- **THEN** syntax highlighting is applied using highlight.js
- **AND** line numbers are shown on the left
- **AND** the language is auto-detected from file extension

#### Scenario: Other text formats
- **WHEN** .txt, .md, .json, .xml, or .animation files are selected
- **THEN** appropriate syntax highlighting is applied
- **AND** plain text files use monospace formatting
- **AND** long files are virtualized for performance

### Requirement: Error Line Highlighting
The system SHALL highlight lines and columns mentioned in JSON error messages within file previews.

#### Scenario: Error location marking
- **WHEN** a file has errors at specific line:column positions
- **THEN** those lines are highlighted in error color (red background)
- **AND** the error column position is marked with a distinct indicator
- **AND** multiple errors per line are all marked

#### Scenario: Error navigation
- **WHEN** a user clicks an error in the Results tab
- **THEN** the file browser opens to the affected file
- **AND** the view scrolls to the error line
- **AND** the error is highlighted with animation

### Requirement: Error Context Tooltips
The system SHALL show error messages and surrounding context when hovering over error indicators in files.

#### Scenario: Hover on error line
- **WHEN** a user hovers over a highlighted error line
- **THEN** a tooltip appears showing the error message
- **AND** 3 lines of context before and after are shown
- **AND** the error character is marked within the context

#### Scenario: Multiple errors on one line
- **WHEN** a line has multiple errors at different columns
- **THEN** hovering near each column shows the relevant error
- **AND** all error messages are accessible
- **AND** column positions are visually distinct

### Requirement: Cross-Reference Links
The system SHALL link file references in error messages to the file browser.

#### Scenario: Clickable file paths
- **WHEN** an error message mentions a file path
- **THEN** the path is rendered as a clickable link
- **AND** clicking opens the file in the browser
- **AND** the view scrolls to the relevant line if a line number is specified

#### Scenario: File reference hover
- **WHEN** a user hovers over a file path in error messages
- **THEN** a preview tooltip shows the first few lines of the file
- **AND** for images, a thumbnail is displayed
- **AND** file metadata (size, type) is shown
