# Code Organization Specification

## MODIFIED Requirements

### Requirement: Utility functions must be centralized in dedicated modules
The system SHALL consolidate duplicate utility functions into centralized modules organized by responsibility, eliminating code duplication and providing single source of truth for common operations.

#### Scenario: HTML escaping is performed consistently

**Given** a string containing HTML special characters  
**When** the string needs to be displayed safely in the DOM  
**Then** the `escapeHtml()` function from `utils/html-utils.mjs` must be used  
**And** the function must escape `&`, `<`, `>`, `"`, and `'` characters  
**And** there must be only one implementation across the entire codebase

**Acceptance criteria**:
- Zero duplicate `escapeHtml` implementations exist
- All call sites import from `utils/html-utils.mjs`
- Function handles null/undefined gracefully by converting to string

#### Scenario: XML escaping is performed consistently

**Given** a string containing XML special characters  
**When** the string needs to be included in XML output  
**Then** the `escapeXml()` function from `utils/html-utils.mjs` must be used  
**And** the function must escape `&`, `<`, `>`, `"`, and `'` characters  
**And** there must be only one implementation across the entire codebase

**Acceptance criteria**:
- Zero duplicate `escapeXml` implementations exist
- All call sites import from `utils/html-utils.mjs`
- XML exports (CSV, data export) use consistent escaping

### Requirement: Data formatting must use centralized format utilities
The system SHALL use centralized formatting functions for all data display operations to ensure consistency across UI components and simplify maintenance.

#### Scenario: File sizes are formatted consistently

**Given** a file size in bytes  
**When** the size needs to be displayed to the user  
**Then** the `formatBytes()` function from `utils/format-utils.mjs` must be used  
**And** the function must return human-readable sizes (B, KB, MB, GB)  
**And** formatting must be consistent across all tabs and components

**Acceptance criteria**:
- All file size displays use `formatBytes()` from utils
- Format: "X.XX KB" with 2 decimal places
- Handles zero and negative values gracefully

#### Scenario: Processing times are formatted consistently

**Given** a processing time in milliseconds  
**When** the time needs to be displayed to the user  
**Then** the `formatDuration()` function from `utils/format-utils.mjs` must be used  
**And** the function must show milliseconds (<1000ms) or seconds (≥1000ms)  
**And** formatting must be consistent across all tabs and components

**Acceptance criteria**:
- All duration displays use `formatDuration()` from utils
- Format: "XXXms" for <1s, "X.XXs" for ≥1s
- Consistent across mod list, statistics, and results displays

### Requirement: DOM manipulation must use safe helper functions
The system SHALL provide safe DOM manipulation helpers that reduce boilerplate code, prevent common null reference errors, and improve code readability.

#### Scenario: Elements are queried safely without null errors

**Given** a CSS selector for a DOM element  
**When** the element needs to be accessed  
**Then** the `querySelector()` helper from `utils/dom-helpers.mjs` SHALL be used  
**And** the helper SHALL handle null results gracefully  
**And** calling code must check for null before accessing properties

**Acceptance criteria**:
- Helper returns null if element not found (doesn't throw)
- Supports optional context parameter (default: document)
- Reduces `Cannot read property of null` errors

#### Scenario: Element content is set safely

**Given** an element and content to display  
**When** the content needs to be set  
**Then** the `setElementContent()` helper SHALL be used  
**And** the helper SHALL choose textContent vs innerHTML based on safety flag  
**And** the helper SHALL handle null elements gracefully

**Acceptance criteria**:
- Default behavior uses textContent (safe from XSS)
- `safe: false` option allows innerHTML for trusted content
- No-op if element is null (doesn't throw)

## ADDED Requirements

### Requirement: Utility modules must be organized by responsibility
The system SHALL organize utility functions into separate modules based on their primary responsibility (HTML/DOM, formatting, or DOM helpers) to maintain clear boundaries and improve discoverability.

#### Scenario: HTML-related utilities are grouped together

**Given** a new HTML/DOM utility function needs to be added  
**When** determining where to place it  
**Then** it must be added to `utils/html-utils.mjs` if it handles HTML/XML escaping or element creation  
**And** the module must only contain HTML/DOM-related utilities  
**And** functions must be exported individually (named exports)

**Acceptance criteria**:
- `html-utils.mjs` contains: escapeHtml, escapeXml, createElement, setElementContent
- Module does not contain formatting or query utilities
- All functions have JSDoc documentation

#### Scenario: Formatting utilities are grouped together

**Given** a new data formatting function needs to be added  
**When** determining where to place it  
**Then** it must be added to `utils/format-utils.mjs` if it formats data for display  
**And** the module must only contain formatting-related utilities  
**And** functions must be exported individually (named exports)

**Acceptance criteria**:
- `format-utils.mjs` contains: formatBytes, formatDuration, formatTimestamp, formatNumber
- Module does not contain HTML escaping or DOM utilities
- All functions have JSDoc documentation

#### Scenario: DOM helpers are grouped together

**Given** a new DOM manipulation helper needs to be added  
**When** determining where to place it  
**Then** it must be added to `utils/dom-helpers.mjs` if it manipulates or queries the DOM  
**And** the module must only contain DOM manipulation utilities  
**And** functions must be exported individually (named exports)

**Acceptance criteria**:
- `dom-helpers.mjs` contains: querySelector, querySelectorAll, addClass, removeClass, toggleClass, empty, show, hide
- Module does not contain formatting or HTML escaping
- All functions have JSDoc documentation

### Requirement: Backward compatibility must be maintained during migration
The system SHALL ensure all functionality continues working correctly while utility function migration is in progress, allowing incremental refactoring without breaking changes.

#### Scenario: Old implementations coexist with new utilities during transition

**Given** a utility function has been centralized in utils/  
**When** migration to the new location is in progress  
**And** some files still use the old implementation  
**Then** both old and new implementations must function correctly  
**And** the old implementation can be removed only after all call sites are migrated  
**And** each file migration must be tested independently

**Acceptance criteria**:
- Application remains functional after each individual file migration
- No breaking changes to external APIs or user-facing behavior
- Each migration is an atomic, revertible commit
- Manual test suite passes after each migration step
