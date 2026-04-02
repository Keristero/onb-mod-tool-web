# Statistics Tab UI - Warnings Display Specification

## ADDED Requirements

### Requirement: Display \"Valid Mods with Warnings %\" metric in session statistics
**Description**: Add new overview card showing percentage of mods that passed validation (clean or with warnings only).

#### Scenario: Calculate and display valid-with-warnings percentage
**Given** session statistics are rendered for multiple mods  
**When** overview cards section is rendered  
**Then** a new card displays \"Valid Mods with Warnings %\" metric  
**And** value = (successful + successWithWarnings) / total * 100  
**And** metric only appears in session view (not file/single-mod view)

#### Scenario: Valid-with-warnings percentage appears alongside success rate
**Given** overview statistics cards  
**When** cards are rendered  
**Then** \"Valid Mods with Warnings %\" card appears near \"Success Rate\" card  
**And** both cards are visually grouped as validation outcomes  
**And** success rate specifically shows clean mods only, this metric shows all passing mods

### Requirement: Display warnings in expandable sections alongside errors
**Description**: Add separate \"Warnings\" sections for session and file statistics, similar to error sections.

#### Scenario: Show warnings section in file statistics
**Given** file/single-mod statistics are rendered  
**When** warning count > 0  
**Then** an expandable \"Most Common Warnings\" section appears (similar to \"Most Common Errors\")  
**And** section title includes count: \"Most Common Warnings (5)\"  
**And** section is collapsed by default

#### Scenario: Show warnings section in session statistics
**Given** session statistics are rendered  
**When** aggregated warning count > 0  
**Then** an expandable \"Most Common Warnings\" section appears  
**And** section displays top 100 warning messages by occurrence count  
**And** each warning shows count of occurrences  
**And** section is collapsed by default

#### Scenario: Warnings section uses bar chart for display
**Given** \"Most Common Warnings\" section is expanded  
**When** warnings are rendered  
**Then** warnings are displayed using bar chart (same `renderErrorMessagesChart()` utility as errors)  
**And** bars use greenish-yellow color (#C0CA33) not error color  
**And** chart shows message on Y-axis, occurrence count on X-axis

### Requirement: Add warnings to statistics overview cards
**Description**: Update overview cards to show warning counts alongside error counts.

#### Scenario: Session overview shows warning count
**Given** session statistics are calculated and rendered  
**When** overview cards section is shown  
**Then** a card displays \"Warnings: {total}\" count  
**And** card appears near \"Errors: {total}\" card  
**And** card background/border uses greenish-yellow styling

#### Scenario: File overview shows warning count for current mod
**Given** file statistics for a single mod are rendered  
**When** overview cards are shown  
**Then** a card displays \"Warnings: {count}\" for the current mod  
**And** if warning count is 0, card may show \"0\" with grayed styling

### Requirement: Warnings are included in data exports
**Description**: CSV and XML exports include warning statistics and details.

#### Scenario: CSV export includes warning columns
**Given** user exports session statistics to CSV  
**When** export is generated  
**Then** CSV includes columns: \"Warnings\", \"Warning Types\", \"Most Common Warnings\"  
**And** each mod row includes its warning count  
**And** aggregate rows show total warnings and percentage

#### Scenario: XML export includes warning elements
**Given** user exports statistics to XML  
**When** export is generated  
**Then** XML includes elements for `<warnings>` with count and message details  
**And** structure mirrors existing error export structure  
**And** validWithWarningsRate appears in summary section

## Related Capabilities
- **statistics-tracking**: Provides aggregated warning data to display
- **styling-theme**: Provides color constants for warning styling
- **ui-results-display**: Already displays per-mod warnings; statistics shows aggregated warnings
