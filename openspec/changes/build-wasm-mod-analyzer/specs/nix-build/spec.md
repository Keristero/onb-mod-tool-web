## ADDED Requirements

### Requirement: Dual-Target Build System
The system SHALL provide a Nix derivation that builds both native executable and browser WebAssembly targets from the same DartLangModTool source.

#### Scenario: Native CLI build
- **WHEN** `nix build .#native` is executed in src/
- **THEN** a native executable is produced in result/bin/onb_mod_file
- **AND** it runs as a standalone CLI application
- **AND** supports all command-line options

#### Scenario: WebAssembly build
- **WHEN** `nix build .#wasm` is executed in src/
- **THEN** onb_mod_file.wasm and onb_mod_file.mjs are produced
- **AND** they are compatible with browser Web Worker environments
- **AND** build artifacts are copied to src/web/versions/latest/

#### Scenario: Dependency isolation
- **WHEN** either build target is executed
- **THEN** all Dart dependencies are vendored using autoPubspecLock
- **AND** builds are reproducible across different machines
- **AND** no internet access is required during build phase

### Requirement: Submodule-Compatible Structure
The system SHALL organize the build derivation one level above DartLangModTool-master to support future git submodule configuration.

#### Scenario: Submodule preparation
- **WHEN** DartLangModTool-master becomes a git submodule
- **THEN** src/default.nix continues to reference it correctly
- **AND** no build system changes are required
- **AND** submodule updates work seamlessly

#### Scenario: Version pinning
- **WHEN** a specific DartLangModTool commit is needed
- **THEN** the submodule reference can be updated
- **AND** the Nix build uses that exact version
- **AND** old versions remain accessible via git
