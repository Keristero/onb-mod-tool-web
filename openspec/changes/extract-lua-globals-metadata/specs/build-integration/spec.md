# Build Workflow Integration

## ADDED Requirements

### Requirement: Mise Task for Globals Extraction
**Priority**: High  
**Status**: Proposed

The build system SHALL provide a mise task that runs the globals extraction script as part of the build workflow.

#### Scenario: Extract-Globals Task Executes Successfully
**Given** the mise environment is configured  
**When** `mise run extract-globals` is executed  
**Then** the extraction script runs  
**And** the metadata.json file is updated with globals data  
**And** the task exits with success status

#### Scenario: Extract-Globals Uses Node.js
**Given** Node.js is required for the extraction script  
**When** the extract-globals task runs  
**Then** the mise task ensures Node.js is available  
**And** the script executes using node command

#### Scenario: Task Determines Current Version
**Given** the build targets a specific analyzer version  
**When** the extract-globals task runs  
**Then** the task reads the version from the appropriate source  
**And** outputs globals data to the correct version directory

#### Scenario: Build Task Depends on Globals Extraction
**Given** the build:web task compiles the WASM module  
**When** the build:web task runs  
**Then** it first executes the extract-globals task  
**And** ensures metadata.json includes globals before packaging

### Requirement: GitHub Actions Integration
**Priority**: High  
**Status**: Proposed

The CI/CD workflow SHALL execute globals extraction as part of the automated build process.

#### Scenario: Workflow Runs Extraction Before Build
**Given** the GitHub Actions workflow is triggered  
**When** the build job executes  
**Then** the extract-globals step runs before WASM compilation  
**And** the workflow fails if extraction fails

#### Scenario: Metadata Includes Globals in Artifacts
**Given** the build workflow completes successfully  
**When** the versioned artifacts are created  
**Then** the metadata.json file includes the luaGlobals field  
**And** the globals data is accurate for that version

### Requirement: Version Directory Structure
**Priority**: Medium  
**Status**: Proposed

The build system SHALL maintain proper directory structure for versioned builds including metadata files.

#### Scenario: Metadata Stored Per Version
**Given** a new analyzer version is built  
**When** the build completes  
**Then** metadata.json exists in `web/versions/vX.X.X/` directory  
**And** contains version-specific globals data

#### Scenario: Latest Symlink Updated
**Given** a new version build completes  
**When** artifacts are deployed  
**Then** the `web/versions/latest/` directory points to the new version  
**And** includes the updated metadata.json with globals

## Implementation Notes

- Task should be idempotent (safe to re-run)
- Build should fail early if extraction fails
- Extraction adds minimal overhead to build time (<10 seconds)
- Task should work with both local builds and CI/CD
