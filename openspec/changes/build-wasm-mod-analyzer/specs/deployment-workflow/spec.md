## ADDED Requirements

### Requirement: Manual Workflow Trigger
The system SHALL provide a GitHub Actions workflow that is manually triggered with a version number input.

#### Scenario: Workflow dispatch
- **WHEN** a maintainer navigates to Actions → Deploy Mod Analyzer
- **THEN** a "Run workflow" button is available
- **AND** a version number input field is required (e.g., "1.2.3")
- **AND** the workflow starts when triggered

#### Scenario: Version validation
- **WHEN** the workflow receives a version number
- **THEN** it validates the format (semver)
- **AND** checks that the version doesn't already exist
- **AND** fails with clear error if validation fails

### Requirement: Automated Build in CI
The system SHALL build the WASM artifacts using Nix within GitHub Actions runners.

#### Scenario: Nix setup
- **WHEN** the workflow runs
- **THEN** Nix is installed or cached on the runner
- **AND** the src/default.nix derivation is evaluated
- **AND** the wasm target is built successfully

#### Scenario: Build artifact verification
- **WHEN** the build completes
- **THEN** onb_mod_file.wasm and onb_mod_file.mjs exist
- **AND** file sizes are validated (not empty, reasonable size)
- **AND** WASM module validity is checked

### Requirement: Versioned Artifact Deployment
The system SHALL copy built artifacts to a versioned directory and update version metadata.

#### Scenario: Version directory creation
- **WHEN** build artifacts are ready
- **THEN** a new directory src/web/versions/<version>/ is created
- **AND** WASM and MJS files are copied there
- **AND** metadata.json is generated with build info

#### Scenario: Version index update
- **WHEN** a new version is deployed
- **THEN** src/web/versions/index.json is updated to include it
- **AND** the new version is marked as the latest
- **AND** the file is committed to the repository

### Requirement: GitHub Pages Deployment
The system SHALL deploy the entire src/web/ directory to GitHub Pages as a static site.

#### Scenario: Static site deployment
- **WHEN** artifacts and metadata are ready
- **THEN** the entire src/web/ directory is deployed to gh-pages branch
- **AND** GitHub Pages is configured to serve from that branch
- **AND** the site is accessible at the configured URL

#### Scenario: Deployment verification
- **WHEN** deployment completes
- **THEN** the workflow performs a health check by fetching the index page
- **AND** verifies the new version is listed in index.json
- **AND** confirms the latest version loads successfully

#### Scenario: Rollback capability
- **WHEN** a deployment needs to be reverted
- **THEN** previous versions remain accessible in their directories
- **AND** the version selector allows choosing any previous version
- **AND** the latest symlink can be manually updated if needed

### Requirement: Build Notifications
The system SHALL notify maintainers of deployment success or failure.

#### Scenario: Successful deployment
- **WHEN** the workflow completes successfully
- **THEN** a summary comment is posted on the workflow run
- **AND** includes deployed version, artifact sizes, and live URL
- **AND** optionally notifies via configured channels (Discord, email)

#### Scenario: Failed deployment
- **WHEN** the workflow fails at any step
- **THEN** the failure point is clearly logged
- **AND** artifacts are preserved for debugging
- **AND** the failure is reported with actionable error messages
