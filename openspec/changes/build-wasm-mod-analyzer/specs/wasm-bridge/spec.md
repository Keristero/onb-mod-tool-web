## ADDED Requirements

### Requirement: Browser-Compatible WASM Entry Point
The system SHALL provide a web entry point for DartLangModTool that compiles to WebAssembly without requiring `dart:io` dependencies.

#### Scenario: WASM module compiles successfully
- **WHEN** `dart compile wasm web/main.dart` is executed
- **THEN** the build succeeds without dart:io dependency errors
- **AND** produces onb_mod_file.wasm and onb_mod_file.mjs files

#### Scenario: JS-exposed analysis function
- **WHEN** the WASM module is instantiated in a browser
- **THEN** an `analyzeModFile(uint8Array)` function is available to JavaScript
- **AND** it accepts mod file bytes as Uint8Array input
- **AND** it returns JSON analysis results as a string

### Requirement: Dynamic CLI Argument Handling
The system SHALL handle command-line arguments dynamically through JavaScript interop without modifying the core DartLangModTool codebase.

#### Scenario: CLI options passed from JavaScript
- **WHEN** JavaScript calls `analyzeModFile(bytes, options)`
- **THEN** the WASM bridge translates options into CLI argument format
- **AND** passes them to the existing argument parser
- **AND** preserves all existing CLI functionality

#### Scenario: No core code modifications
- **WHEN** the DartLangModTool core library is updated
- **THEN** the WASM bridge continues to work without changes
- **AND** new CLI options are automatically supported

### Requirement: Browser-Compatible File Handling
The system SHALL replace all `dart:io` file operations with browser-compatible alternatives using `dart:typed_data` and `archive` package.

#### Scenario: In-memory mod processing
- **WHEN** a Uint8Array containing a mod zip file is provided
- **THEN** the system processes it entirely in memory using the archive package
- **AND** extracts and analyzes all mod files without filesystem access
- **AND** returns complete analysis results

#### Scenario: STDOUT capture
- **WHEN** the CLI would normally print to console
- **THEN** output is captured in a string buffer
- **AND** returned alongside JSON results
- **AND** formatted for web display
