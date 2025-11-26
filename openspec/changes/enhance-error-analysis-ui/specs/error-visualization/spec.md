# Specification: Error Visualization

## ADDED Requirements

### Requirement: Console-First Results Layout
The results tab SHALL display console output (stdout/stderr) at the top of the content area, before the mod summary and JSON tree, to prioritize error visibility.

#### Scenario: Error-first display order
- **WHEN** a mod analysis completes with errors
- **THEN** the console output section appears at the top of the results tab
- **AND** the mod summary appears below console output
- **AND** the JSON tree appears below the mod summary

#### Scenario: No errors still shows layout
- **WHEN** a mod analysis completes with no errors or warnings
- **THEN** the console output section is hidden or shows "No errors or warnings"
- **AND** the mod summary and JSON tree display normally

### Requirement: Interactive Filename Previews
The system SHALL make filenames in console output interactive, showing a hover preview of the file content when the user hovers over them.

#### Scenario: Hover filename shows preview
- **WHEN** user hovers mouse over a filename in console output (e.g., "entry.lua")
- **THEN** a popup preview appears within 300ms showing the file content
- **AND** the preview displays syntax-highlighted code if the file is text
- **AND** the preview displays the first 20 lines of the file by default

#### Scenario: Click filename navigates to file browser
- **WHEN** user clicks on a filename in the preview popup
- **THEN** the file browser tab becomes active
- **AND** the clicked file is selected in the file tree
- **AND** the file content is displayed in the main preview area

#### Scenario: Non-existent file shows no preview
- **WHEN** user hovers over text that looks like a filename but doesn't exist in the mod
- **THEN** no preview popup appears
- **AND** the text remains non-interactive (no cursor change, no underline)

### Requirement: Error Location Highlighting
The system SHALL parse error locations in console output (e.g., `file.lua:24:39` or `[24:39]`) and provide interactive previews that highlight the exact error position.

#### Scenario: Hover line:column shows precise location
- **WHEN** user hovers over an error location like `[24:39]` in console output
- **THEN** a preview popup appears showing the file with line 24 visible
- **AND** column 39 on that line has an animated pulsing highlight
- **AND** the highlight animation runs for 2 seconds (3 pulses of 0.7s each)

#### Scenario: Line-only error shows line highlight
- **WHEN** user hovers over an error location like `file.lua:24` (no column)
- **THEN** a preview popup appears showing the file with line 24 visible
- **AND** the entire line 24 is highlighted with a static background color
- **AND** no column-specific animation plays

#### Scenario: Preview shows surrounding context
- **WHEN** an error location preview is displayed
- **THEN** the preview shows 10 lines before and 10 lines after the error line
- **AND** the error line is positioned near the center of the preview
- **AND** line numbers are displayed for all visible lines

### Requirement: Multi-Error File Highlighting
When a filename appears in multiple error messages, the system SHALL highlight all error lines in the preview when the user hovers over that filename.

#### Scenario: Hover filename with multiple errors
- **WHEN** user hovers over "entry.lua" in console output
- **AND** there are errors at lines 10, 24, and 45 in entry.lua
- **THEN** the preview shows all three lines highlighted
- **AND** the primary error (closest to hover location) has 100% opacity highlight
- **AND** the other error lines have 50% opacity highlight

#### Scenario: Preview shows all error lines even if far apart
- **WHEN** user hovers over a filename with errors on lines 5 and 500
- **THEN** the preview initially shows lines around the first error (line 5)
- **AND** a note indicates "Additional errors on lines: 500"
- **AND** user can scroll within the preview to see all errors

### Requirement: Shared File Preview Component
The system SHALL provide a reusable file preview component that both the results tab and file browser tab use for consistent file rendering behavior.

#### Scenario: Preview manager renders text files
- **WHEN** preview manager receives a text file (lua, txt, json, etc.)
- **THEN** it renders the file with syntax highlighting
- **AND** it applies line highlighting if specified via options
- **AND** it applies column highlighting if specified via options

#### Scenario: Preview manager renders images
- **WHEN** preview manager receives an image file (png, jpg, gif)
- **THEN** it renders the image with max-width constraints
- **AND** no syntax highlighting or line numbers are shown

#### Scenario: Preview manager handles binary files
- **WHEN** preview manager receives a binary file
- **THEN** it displays file size and type information
- **AND** no preview content is rendered

#### Scenario: Preview manager supports highlight options
- **WHEN** preview manager is called with `{ line: 24, column: 39 }`
- **THEN** it scrolls to line 24
- **AND** it highlights column 39 with animation
- **WHEN** called with `{ lines: [10, 24, 45] }`
- **THEN** it highlights all specified lines with appropriate opacity

### Requirement: Error Location Pattern Parsing
The system SHALL parse multiple error location patterns from console output, including file:line:column, file:line, and bracketed [line:column] formats.

#### Scenario: Parse file:line:column format
- **WHEN** parser encounters "entry.lua:24:39" in console output
- **THEN** it extracts `{file: "entry.lua", line: 24, column: 39}`
- **AND** makes the text interactive with appropriate data attributes

#### Scenario: Parse bracketed format
- **WHEN** parser encounters "[24:39]" in console output
- **THEN** it extracts `{line: 24, column: 39, file: null}`
- **AND** infers the filename from preceding context (e.g., "ERR: entry.lua [24:39]")

#### Scenario: Parse bracketed format with spaces
- **WHEN** parser encounters "[ 24:39 ]" (with spaces)
- **THEN** it extracts `{line: 24, column: 39, file: null}`
- **AND** whitespace is ignored during parsing

#### Scenario: Parse file line N format
- **WHEN** parser encounters "entry.lua line 24" in console output
- **THEN** it extracts `{file: "entry.lua", line: 24, column: null}`

### Requirement: Preview Popup Positioning
The system SHALL position preview popups near the hovered element while ensuring they remain within the viewport.

#### Scenario: Popup appears near hover target
- **WHEN** user hovers over an error location near the center of the screen
- **THEN** the popup appears 10px to the right and 10px below the cursor
- **AND** the popup does not overlap the hovered text

#### Scenario: Popup repositions if near viewport edge
- **WHEN** user hovers over an error location near the right edge of the viewport
- **THEN** the popup appears to the left of the cursor instead
- **WHEN** near the bottom edge
- **THEN** the popup appears above the cursor instead

#### Scenario: Popup dismisses on mouse move away
- **WHEN** user moves mouse away from both the hovered element and the popup
- **THEN** the popup fades out and disappears within 200ms
- **AND** the popup does not reappear unless the user hovers again

#### Scenario: Popup dismisses on Escape key
- **WHEN** a preview popup is visible
- **AND** user presses the Escape key
- **THEN** the popup immediately disappears
- **AND** focus returns to the console output area

### Requirement: File Browser Navigation Integration
When a user clicks on a preview popup, the system SHALL navigate to the file browser tab and select the previewed file.

#### Scenario: Click preview navigates and selects file
- **WHEN** user clicks anywhere on a preview popup showing "entry.lua"
- **THEN** the file browser tab becomes the active tab
- **AND** "entry.lua" is selected in the file tree
- **AND** the file content is displayed in the file browser's preview pane

#### Scenario: Click preview scrolls to error line
- **WHEN** user clicks on a preview popup that was showing line 24
- **THEN** the file browser scrolls to line 24
- **AND** line 24 is highlighted with the same error styling
- **AND** the viewport is centered on line 24 if possible

#### Scenario: Click preview with column scrolls and highlights
- **WHEN** user clicks on a preview popup that was showing line 24, column 39
- **THEN** the file browser scrolls to line 24
- **AND** column 39 is highlighted with the pulsing animation
- **AND** the animation plays once (3 pulses) then stops

### Requirement: Hover Delay and Debouncing
The system SHALL implement a hover delay to prevent accidental preview triggers and debounce rapid mouse movements.

#### Scenario: No preview for quick mouse pass-through
- **WHEN** user moves mouse across a filename in less than 300ms
- **THEN** no preview popup appears
- **AND** no file content is loaded

#### Scenario: Preview appears after hover delay
- **WHEN** user hovers over a filename for more than 300ms
- **THEN** the preview popup appears
- **AND** the file content is loaded and displayed

#### Scenario: Hover cancel before delay prevents preview
- **WHEN** user hovers over a filename for 200ms
- **AND** moves mouse away before 300ms elapses
- **THEN** no preview popup appears
- **AND** the hover timer resets

### Requirement: Performance Optimization for Large Files
The system SHALL optimize preview rendering for large files by truncating content and disabling expensive features.

#### Scenario: Truncate preview for large files
- **WHEN** a file has more than 1000 lines
- **THEN** the preview shows only the requested 20-line context window
- **AND** a note indicates "Large file - showing lines X-Y of Z total"
- **AND** syntax highlighting is disabled for performance

#### Scenario: Truncate long lines
- **WHEN** a line in the preview exceeds 200 characters
- **THEN** the line is truncated with "..." ellipsis
- **AND** a tooltip on hover shows the full line content
- **AND** the full line is visible when navigating to file browser

#### Scenario: Cache previews for repeated hovers
- **WHEN** user hovers over the same filename multiple times
- **THEN** the preview content is served from cache after the first load
- **AND** cache persists for the duration of the analysis session
- **AND** cache is cleared when a new mod is analyzed
