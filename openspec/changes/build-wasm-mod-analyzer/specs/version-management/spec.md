## ADDED Requirements

### Requirement: Version Directory Structure
The system SHALL organize WASM artifacts in a versioned directory structure under src/web/versions/.

#### Scenario: Version organization
- **WHEN** a new WASM build is created
- **THEN** artifacts are placed in src/web/versions/<version>/ directory
- **AND** the directory contains onb_mod_file.wasm and onb_mod_file.mjs
- **AND** a metadata.json file describes the version (build date, features, changelog)

#### Scenario: Latest symlink
- **WHEN** the default version needs to be updated
- **THEN** src/web/versions/latest/ contains the most recent build
- **AND** it is the default loaded by the web interface
- **AND** old versions remain accessible in their directories

### Requirement: Dynamic Version Selection
The system SHALL provide a UI control for selecting and loading different WASM versions at runtime.

#### Scenario: Version dropdown
- **WHEN** the web interface loads
- **THEN** a version selector dropdown lists all available versions
- **AND** versions are ordered newest to oldest
- **AND** the currently loaded version is indicated

#### Scenario: Version switching
- **WHEN** a user selects a different version
- **THEN** the WASM worker is terminated and reinitialized
- **AND** the new version's WASM and MJS files are loaded
- **AND** a notification confirms the version change
- **AND** the interface remains usable without page reload

### Requirement: Version Metadata Display
The system SHALL display version information including build date, features, and capabilities.

#### Scenario: Version info panel
- **WHEN** a version is selected
- **THEN** metadata is displayed showing: version number, build date, DartLangModTool commit hash, supported CLI options
- **AND** a changelog highlights differences from previous version
- **AND** known issues are listed if any

#### Scenario: Version discovery
- **WHEN** the web interface loads
- **THEN** it queries src/web/versions/index.json for available versions
- **AND** dynamically populates the version selector
- **AND** handles missing or corrupted version data gracefully

### Requirement: Version Comparison
The system SHALL support running the same mod file against multiple versions for comparison.

#### Scenario: Dual analysis
- **WHEN** "Compare Versions" mode is enabled
- **THEN** users can select two versions to run in parallel
- **AND** the same mod file is processed by both versions
- **AND** results are displayed side-by-side

#### Scenario: Diff visualization
- **WHEN** comparison results are available
- **THEN** differences in errors, warnings, and output are highlighted
- **AND** added/removed errors are marked with colors
- **AND** a summary shows net change in error count
