# Styling and Theme Specification

## ADDED Requirements

### Requirement: Define and apply yellowish-lime green color for validation warnings
**Description**: Add new CSS color variable for validation warning theme, distinct from existing error and success colors.

#### Scenario: Define warning color variable
**Given** CSS root variables are defined  
**When** styles are loaded  
**Then** `--validation-warning-color` is set to #C0CA33  
**And** color is placed in :root alongside existing color variables  
**And** color comment indicates use case: \"Validation warnings - informational, non-critical\"

#### Scenario: Warning color is accessible and distinct
**Given** comparison of all status colors  
**When** displayed together  
**Then** #C0CA33 is visually distinct from:  
  - #f44336 (red/error)  
  - #ff9800 (orange/warning)  
  - #4CAF50 (green/success)  
  - #2196F3 (blue/primary)  
**And** color passes WCAG AA contrast requirements against background  
**And** color is discernible to users with color blindness (deuteranopia, protanopia)

### Requirement: Apply warning color to UI elements
**Description**: Warning elements throughout the UI use the new warning color consistently.

#### Scenario: Warning list items have warning styling
**Given** warnings are rendered in results tab  
**When** CSS is applied  
**Then** warning items have:  
  - Left border: 3px solid var(--validation-warning-color)  
  - Background: rgba(192, 202, 51, 0.08) (light tint of warning color)  
  - Text color: readable against background

#### Scenario: Warning summary cards use warning color
**Given** statistics overview cards are rendered  
**When** a card displays warning count  
**Then** card has:  
  - Border-color: var(--validation-warning-color)  
  - Icon or accent color: var(--validation-warning-color)  
**And** reuses existing .summary-item CSS class structure

#### Scenario: Warning chart bars use warning color
**Given** warnings are displayed in bar charts  
**When** chart is rendered  
**Then** bars use var(--validation-warning-color) for bar fill  
**And** reuses existing `createBarChart()` utility with color parameter  
**And** tooltips display accurate warning counts

#### Scenario: Status indicator for success-with-warnings
**Given** mod status is 'success-with-warnings'  
**When** status is displayed in mod list or results  
**Then** status indicator uses warning color to show caution variant  
**And** status text reads \"Success (with Warnings)\" or similar  
**And** does not override the success color entirely (remains clear it passed validation)

### Requirement: Maintain backward compatibility of existing colors
**Description**: New warning color additions do not modify or conflict with existing error/success/warning styling.

#### Scenario: Existing error styling unchanged
**Given** existing error display styling  
**When** new validation-warning-color is added  
**Then** error elements continue using --error-color (#f44336)  
**And** no changes to .error-line, .error-item, or other error classes  
**And** validation errors and analysis errors maintain red theme

#### Scenario: Existing success styling unchanged
**Given** existing success display styling  
**When** new validation-warning-color is added  
**Then** success elements continue using --success-color (#4CAF50)  
**And** mod items with status 'success' remain green  
**And** success-with-warnings status uses new color without affecting pure success status

### Requirement: Documentation and maintainability
**Description**: Color definitions and usage are documented for future maintainability.

#### Scenario: Color constants documented in constants.mjs
**Given** constants file  
**When** validation-warning-color is used  
**Then** a comment in constants.mjs (or styles.css) explains:  
  - Purpose: \"Validation warnings - non-critical issues that don't fail validation\"  
  - Hex value: #C0CA33  
  - Where used: Results tab warnings, Statistics tab warnings, Status indicators  
  - Design rationale: \"Yellowish-lime green chosen for distinct visibility\"

## Related Capabilities
- **ui-results-display**: Applies warning color to warning display in results tab
- **ui-statistics-display**: Applies warning color to statistics charts and cards
- **error-classification**: Provides warnings that are themed with this color
