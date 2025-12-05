# Enhanced Lua Syntax Highlighting

## ADDED Requirements

### Requirement: Load Version-Specific Globals Metadata
**Priority**: High  
**Status**: Proposed

The file browser SHALL load and parse the luaGlobals metadata for the currently selected analyzer version.

#### Scenario: Metadata Loaded on Version Selection
**Given** a user selects an analyzer version  
**When** the version is activated  
**Then** the file browser loads the corresponding metadata.json file  
**And** parses the luaGlobals field into memory

#### Scenario: Build Globals Lookup Set
**Given** the luaGlobals data has been parsed  
**When** preparing for syntax highlighting  
**Then** a Set data structure is created for O(1) lookup performance  
**And** includes all functions, table names, and variables

#### Scenario: Handle Missing Metadata Gracefully
**Given** a metadata.json file without luaGlobals field  
**When** the file browser attempts to load globals  
**Then** no errors are thrown  
**And** the file browser operates normally without enhanced highlighting

### Requirement: Post-Process Lua Syntax Highlighting
**Priority**: High  
**Status**: Proposed

The file browser SHALL enhance highlight.js output by applying custom styling to ONB-specific Lua globals.

#### Scenario: Identify ONB Global Identifiers
**Given** a Lua file has been processed by highlight.js  
**When** post-processing for ONB globals  
**Then** all identifier tokens are checked against the globals lookup set  
**And** matching tokens receive the .hljs-onb-global CSS class

#### Scenario: Highlight Global Functions
**Given** Lua code contains a call to `load_texture("path")`  
**When** the file is displayed with enhanced highlighting  
**Then** the `load_texture` identifier is styled with the ONB global color  
**And** is visually distinct from other code elements

#### Scenario: Highlight Table Member Access
**Given** Lua code contains `Element.Fire`  
**When** the file is displayed with enhanced highlighting  
**Then** both `Element` and `Fire` are styled with the ONB global color  
**And** the dot notation is preserved

#### Scenario: Highlight Enum Values
**Given** Lua code contains `CardClass.Mega`  
**When** the file is displayed with enhanced highlighting  
**Then** `CardClass` is styled as an ONB global table  
**And** `Mega` is styled as an ONB global field

#### Scenario: Preserve Existing Highlighting
**Given** Lua code with standard syntax (keywords, strings, numbers)  
**When** enhanced highlighting is applied  
**Then** existing highlight.js styling remains intact  
**And** only additional ONB global styling is added

### Requirement: Distinct Visual Styling
**Priority**: High  
**Status**: Proposed

ONB-specific globals SHALL be rendered with a distinct color that differentiates them from standard Lua syntax elements.

#### Scenario: Apply Custom CSS Class
**Given** an identifier is recognized as an ONB global  
**When** rendering the code  
**Then** the .hljs-onb-global CSS class is applied to the token  
**And** overrides or supplements default highlight.js styling

#### Scenario: Color is Distinct and Readable
**Given** the ONB global color is defined in CSS  
**When** viewing Lua code  
**Then** ONB globals are easily distinguishable from keywords, functions, and strings  
**And** the color provides adequate contrast in both light and dark themes

#### Scenario: Color Consistency Across Files
**Given** multiple Lua files are viewed in the same session  
**When** ONB globals appear in different files  
**Then** they all use the same consistent color  
**And** the styling is uniform throughout the interface

### Requirement: Performance Optimization
**Priority**: Medium  
**Status**: Proposed

The globals highlighting enhancement SHALL not significantly impact file display performance.

#### Scenario: Fast Lookup for Global Matching
**Given** a Lua file with many identifiers  
**When** post-processing for globals highlighting  
**Then** lookup operations complete in O(1) time using Set data structure  
**And** the total processing time is imperceptible to the user (<100ms)

#### Scenario: Cache Globals Lookup Per Version
**Given** a user switches between files in the same analyzer version  
**When** displaying multiple files  
**Then** the globals lookup set is reused across files  
**And** metadata is not re-parsed for each file

## Implementation Notes

- Use bright cyan/teal (#00d9ff) as suggested color
- Consider using CSS custom properties for theme support
- Post-processing should run after highlight.js completes
- Avoid re-parsing the DOM unnecessarily
