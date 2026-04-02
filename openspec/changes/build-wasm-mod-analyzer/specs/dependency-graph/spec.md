## ADDED Requirements

### Requirement: Dependency Data Extraction
The system SHALL extract package IDs and dependency relationships from mod analysis JSON results.

#### Scenario: Parse dependency data
- **WHEN** a mod's JSON results contain package.id and dependencies fields
- **THEN** the system extracts package ID as a node identifier
- **AND** extracts all dependency package IDs
- **AND** stores relationships as directed edges (mod → dependency)

#### Scenario: Multiple mod analysis
- **WHEN** multiple mods are analyzed in a session
- **THEN** dependency data is aggregated across all mods
- **AND** a complete dependency graph is built
- **AND** cross-references are resolved

### Requirement: Interactive Graph Visualization
The system SHALL render a directed graph showing inter-mod dependencies with interactive controls.

#### Scenario: Graph rendering
- **WHEN** the Dependencies tab is opened
- **THEN** a force-directed graph is displayed using D3.js or Cytoscape.js
- **AND** nodes represent mods labeled with package IDs
- **AND** edges represent dependency relationships with arrows
- **AND** the graph auto-layouts for readability

#### Scenario: Interactive exploration
- **WHEN** a user interacts with the graph
- **THEN** nodes can be dragged to reposition
- **AND** zoom and pan controls are available
- **AND** clicking a node highlights its dependencies and dependents

#### Scenario: Node details
- **WHEN** a node is hovered
- **THEN** a tooltip shows mod name, package ID, and dependency count
- **AND** when clicked, shows detailed mod information
- **AND** links to the corresponding analysis results

### Requirement: Circular Dependency Detection
The system SHALL identify and highlight circular dependency chains in the graph.

#### Scenario: Circular dependency identification
- **WHEN** mods have circular dependencies (A→B→C→A)
- **THEN** the affected nodes are highlighted in a warning color
- **AND** the circular path is visually emphasized
- **AND** a notification lists all circular chains

#### Scenario: Cycle-free validation
- **WHEN** no circular dependencies exist
- **THEN** a success indicator is shown
- **AND** the graph uses normal coloring
- **AND** validation badge shows "No cycles detected"

### Requirement: Graph Export
The system SHALL allow exporting the dependency graph in standard formats.

#### Scenario: Export graph as image
- **WHEN** the user clicks "Export as PNG"
- **THEN** the current graph view is rendered to PNG
- **AND** the image preserves zoom and layout
- **AND** file is downloaded with timestamp

#### Scenario: Export graph data
- **WHEN** the user clicks "Export as JSON"
- **THEN** node and edge data is exported in JSON format
- **AND** includes all metadata (package IDs, labels, positions)
- **AND** can be reimported for later viewing
