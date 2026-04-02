## ADDED Requirements

### Requirement: Automated Environment Setup
The system SHALL provide mise tasks that automatically set up nix-portable if Nix is not available on the host system.

#### Scenario: First-time setup
- **WHEN** `mise run setup` is executed on a system without Nix
- **THEN** nix-portable is downloaded and configured
- **AND** subsequent mise tasks use nix-portable transparently
- **AND** the user does not need to manually install Nix

#### Scenario: Nix already available
- **WHEN** `mise run setup` is executed on a system with Nix installed
- **THEN** the existing Nix installation is detected and used
- **AND** nix-portable is not downloaded
- **AND** no conflicts occur

### Requirement: Build Task Automation
The system SHALL provide mise tasks for building native and web targets without manual Nix command invocation.

#### Scenario: Native build
- **WHEN** `mise run build:native` is executed
- **THEN** the Nix native derivation is built
- **AND** the resulting executable is available in result/bin/

#### Scenario: Web build with deployment
- **WHEN** `mise run build:web` is executed
- **THEN** the Nix wasm derivation is built
- **AND** onb_mod_file.wasm and onb_mod_file.mjs are copied to src/web/versions/latest/
- **AND** old version files are preserved in their respective directories

### Requirement: Execution Convenience
The system SHALL provide a mise task for running the native CLI tool for quick testing.

#### Scenario: Run native tool
- **WHEN** `mise run execute -- --path mod.zip` is executed
- **THEN** the native executable is invoked with the provided arguments
- **AND** output is displayed in the terminal
- **AND** no manual path resolution is required

### Requirement: Automatic Documentation
The system SHALL use mise's built-in documentation templating to generate task documentation.

#### Scenario: Task documentation generation
- **WHEN** `mise generate task-docs` is executed
- **THEN** documentation is generated from task descriptions in mise.toml
- **AND** each task includes description, usage, and examples
- **AND** documentation is included in README.md or separate TASKS.md

#### Scenario: Self-documenting tasks
- **WHEN** tasks are defined in mise.toml
- **THEN** each includes a description field for auto-documentation
- **AND** complex tasks include usage examples
- **AND** task dependencies are documented
