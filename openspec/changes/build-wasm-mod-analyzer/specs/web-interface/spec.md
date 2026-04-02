## ADDED Requirements

### Requirement: Modular Architecture
The system SHALL organize the web interface into clean, modular ES6 components that support future extension.

#### Scenario: Separated concerns
- **WHEN** the web application loads
- **THEN** JavaScript modules (.mjs) are separated by responsibility: main.mjs (entry point & coordination), worker.mjs (WASM processing), parser.mjs (JSON handling), tabs/*.mjs (UI per tab)
- **AND** CSS is organized in styles.css with logical sections
- **AND** each module uses ES6 import/export syntax
- **AND** each tab module implements a common interface: init(), render(), clear(), onFileProcessed(result)

#### Scenario: Easy feature addition
- **WHEN** a new feature needs to be added
- **THEN** it can be implemented in a new module without modifying existing ones
- **AND** integration points are clearly defined via the tab interface
- **AND** no monolithic functions exist

### Requirement: Tab Module Interface
The system SHALL define a common interface that all tab modules implement for consistent lifecycle management.

#### Scenario: Tab lifecycle methods
- **WHEN** a tab module is created
- **THEN** it exports init(container) for initialization
- **AND** exports render(data) for displaying content
- **AND** exports clear() for resetting state
- **AND** exports onFileProcessed(result) for handling new analysis results

#### Scenario: Tab coordination
- **WHEN** main.mjs processes a file
- **THEN** it calls onFileProcessed(result) on all tab modules
- **AND** each tab updates its internal state independently
- **AND** tabs only render when visible to optimize performance

### Requirement: Tab-Based Interface
The system SHALL provide a tabbed interface with Results, File Browser, Statistics, and Dependencies views.

#### Scenario: Tab navigation
- **WHEN** a user clicks on a tab
- **THEN** only that tab's content is visible
- **AND** the tab is visually marked as active
- **AND** the previous tab's state is preserved

#### Scenario: Initial state
- **WHEN** a mod file is first analyzed
- **THEN** the Results tab is automatically selected
- **AND** other tabs are enabled and clickable
- **AND** appropriate indicators show which tabs have content

### Requirement: JSON Structure Visualization
The system SHALL display JSON analysis results in a collapsible tree view with syntax highlighting.

#### Scenario: Hierarchical display
- **WHEN** JSON results contain nested objects and arrays
- **THEN** they are displayed as an expandable tree structure
- **AND** expand/collapse icons indicate state
- **AND** indentation shows nesting level

#### Scenario: Syntax highlighting
- **WHEN** JSON is displayed
- **THEN** keys, strings, numbers, booleans, and null values have distinct colors
- **AND** the color scheme is readable on both light and dark backgrounds
- **AND** long strings are truncated with expand option

#### Scenario: Search and filter
- **WHEN** a user types in the search box
- **THEN** matching keys and values are highlighted
- **AND** non-matching branches can be hidden
- **AND** search is case-insensitive with regex support

### Requirement: Drag-and-Drop Upload
The system SHALL support drag-and-drop file upload with visual feedback.

#### Scenario: Drag over drop zone
- **WHEN** a user drags a file over the drop zone
- **THEN** the drop zone changes appearance to indicate it's ready
- **AND** file type validation is shown visually
- **AND** invalid files show rejection indicator

#### Scenario: Drop and process
- **WHEN** a user drops a .zip file
- **THEN** the file is immediately queued for processing
- **AND** a progress indicator appears
- **AND** the drop zone remains available for more files
