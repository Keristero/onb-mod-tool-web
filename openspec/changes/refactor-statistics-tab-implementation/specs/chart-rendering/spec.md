# Chart Rendering Specification

## ADDED Requirements

### Requirement: Chart rendering utilities must be pure, reusable functions

The system SHALL provide pure utility functions for generating chart visualizations that MUST be reusable across multiple contexts without side effects.

#### Scenario: Generate pie chart with custom data
**Given** a developer needs to display data distribution as a pie chart  
**When** they call `createPieChart(segments, options)` with an array of {label, value, color}  
**Then** the function returns SVG markup for a pie chart  
**And** multiple calls with identical input produce identical output  
**And** no DOM mutations occur during the function execution

#### Scenario: Generate bar chart with custom styling
**Given** a developer needs to display ranked data as a bar chart  
**When** they call `createBarChart(items, options)` with an array of {label, value}  
**Then** the function returns HTML markup for a horizontal bar chart  
**And** bars are scaled relative to the maximum value in the dataset  
**And** styling can be customized via options parameter

### Requirement: SVG arc generation must be centralized

All pie chart rendering MUST use a single, shared function for SVG arc path generation to eliminate duplication.

#### Scenario: Create SVG arc path for pie slice
**Given** a pie chart needs to render a slice representing a data segment  
**When** `createArcPath(startAngle, endAngle, radius, center, color, tooltip)` is called  
**Then** a valid SVG `<path>` element is returned  
**And** the arc spans from startAngle to endAngle  
**And** the path includes a tooltip title element with the provided text

#### Scenario: Handle edge case of full circle
**Given** a pie chart has only one segment representing 100% of data  
**When** `createArcPath(0, 360, radius, center, color, tooltip)` is called  
**Then** a complete circle path is rendered  
**And** no visual artifacts or gaps appear

#### Scenario: Handle edge case of zero-width slice
**Given** a data segment has a value that rounds to 0% of the total  
**When** `createArcPath()` receives startAngle === endAngle  
**Then** the function returns an empty string  
**And** no invalid SVG path is generated

### Requirement: Chart legends must be generated consistently

Chart legends MUST follow a consistent HTML structure and MUST be generated alongside chart SVG.

#### Scenario: Generate legend for pie chart
**Given** a pie chart has multiple colored segments  
**When** a legend is generated from the chart data  
**Then** each legend entry shows a color indicator, label, and value  
**And** legend entries appear in the same order as chart segments  
**And** legend HTML structure matches the existing CSS classes

## MODIFIED Requirements

*None - this is a new utility module*

## REMOVED Requirements

*None*
