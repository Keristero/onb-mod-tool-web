# Results Tab UI - Warnings Display Specification

## ADDED Requirements

### Requirement: Display warnings separately from errors in console output
**Description**: Render warnings in a distinct section of the results tab console output, visually separated from errors with distinctive styling.

#### Scenario: Show warnings section only when warnings exist
**Given** a mod has warnings  
**When** results tab renders console output  
**Then** an expandable \"Warnings\" section is displayed  
**And** section title includes warning count: \"Warnings (5)\"  
**And** section is collapsed by default to reduce UI clutter  
**And** if mod has no warnings, section is not rendered

#### Scenario: Display individual warnings with styling
**Given** warnings section is expanded  
**When** warnings are rendered  
**Then** each warning is displayed as a list item  
**And** warning text has greenish-yellow background highlighting  
**And** warning text has greenish-yellow left border (similar to error styling)  
**And** WARN: prefix is removed from display (cleaned message shown)

#### Scenario: Warnings below errors in visual hierarchy
**Given** a mod has both errors and warnings  
**When** console output is rendered  
**Then** \"Errors\" section appears above \"Warnings\" section  
**And** error count and warning count are both visible in headers

### Requirement: Update summary to show warning count
**Description**: Mod summary cards display warning count alongside error information, but validation status remains unaffected.

#### Scenario: Add warning count to summary
**Given** a mod with errors and warnings is loaded  
**When** results tab renders summary  
**Then** a new summary item shows \"Warnings: 3\"  
**And** warnings count is positioned near error count for easy comparison  
**And** summary item uses greenish-yellow styling (consistent with warnings theme)

#### Scenario: Validation passes with warnings in summary
**Given** a mod with warnings but no errors  
**When** results tab renders summary  
**Then** status shows \"Success\" (not \"Failed\")  
**And** warning count is still displayed  
**And** visual indicator makes warning presence clear without implying failure

### Requirement: Console output styling uses warning color theme
**Description**: Warnings are rendered with yellowish-lime green color (#C0CA33) distinct from error color.

#### Scenario: Warning borders and backgrounds use theme color
**Given** warning items are rendered  
**When** CSS classes are applied  
**Then** warning items use `--validation-warning-color` (#C0CA33)  
**And** both border and background apply the theme color (similar to error styling)  
**And** text color is readable against the background

### Requirement: Validation pass/fail indicator independent of warnings
**Description**: The summary status still shows \"Success\" for mods with only warnings, indicating validation passed.

#### Scenario: Success status with warnings present
**Given** a mod has status 'success-with-warnings'  
**When** results tab summary is rendered  
**Then** status displays \"Success\" (or \"Success with Warnings\" for clarity)  
**And** color is green (success color) not red/orange (error/warning)  
**And** warning count is displayed separately below status

#### Scenario: Only errors trigger failed status display
**Given** a mod with warnings but no errors  
**When** results tab renders summary  
**Then** status is NOT displayed as \"Failed\" or \"Validation Failed\"  
**And** validation rules did not produce errors, so validation is not failed

## Related Capabilities
- **error-classification**: Provides classified warnings to display
- **status-logic**: Determines if validation passed (status field)
- **styling-theme**: Provides color constants for warning display
