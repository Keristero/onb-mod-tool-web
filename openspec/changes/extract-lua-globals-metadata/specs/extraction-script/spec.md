# Globals Extraction Script

## ADDED Requirements

### Requirement: Extract Lua Globals from Source
**Priority**: High  
**Status**: Proposed

The system SHALL provide a Node.js script that automatically extracts Lua global definitions from the DartLangModTool source code without requiring modifications to the source files.

#### Scenario: Extract Functions from LuaFuncBuilder
**Given** the script reads a Dart file containing `LuaFuncBuilder.create('function_name')` patterns  
**When** the extraction process runs  
**Then** the function name is added to the `functions` array in the output JSON

#### Scenario: Extract Table Globals with Fields
**Given** the script reads a Dart file containing `LuaObject.table('TableName', { 'field1': value1, 'field2': value2 })` patterns  
**When** the extraction process runs  
**Then** the table name and its field names are added to the `tables` object in the output JSON

#### Scenario: Extract Enum Class Definitions as Tables
**Given** the script reads a Dart file containing an enum declaration like `enum Elements { fire('Fire'), aqua('Aqua') }`  
**When** the extraction process runs  
**Then** the enum name and its string values are added to the `tables` object in the output JSON  
**And** enum values are treated as table fields

#### Scenario: Extract Variable Globals
**Given** the script reads a Dart file containing `LuaObject.variable('var_name', value)` patterns  
**When** the extraction process runs  
**Then** the variable name is added to the `variables` array in the output JSON

#### Scenario: Handle No-Semantics Globals
**Given** the script reads a Dart file containing `LuaObject.noSemantics('identifier')` patterns  
**When** the extraction process runs  
**Then** the identifier is added to the `tables` object with an empty fields array

#### Scenario: Script Handles Parse Errors Gracefully
**Given** the script encounters a malformed or unparseable pattern  
**When** the extraction process runs  
**Then** the script logs a warning and continues processing other patterns  
**And** the script does not terminate with an error

#### Scenario: Output Validates Against Schema
**Given** the script has completed extracting all globals  
**When** generating the JSON output  
**Then** the output structure matches the defined luaGlobals schema  
**And** the JSON is valid and well-formed

### Requirement: Merge Globals into Metadata
**Priority**: High  
**Status**: Proposed

The script SHALL merge extracted globals data into the existing metadata.json file for the target analyzer version.

#### Scenario: Preserve Existing Metadata Fields
**Given** a metadata.json file exists with version, buildDate, and features fields  
**When** the script merges globals data  
**Then** all existing fields are preserved  
**And** the `luaGlobals` field is added or updated

#### Scenario: Create Metadata if Not Exists
**Given** no metadata.json file exists for the target version  
**When** the script runs  
**Then** a new metadata.json file is created with required fields  
**And** the `luaGlobals` field is populated

### Requirement: Script Location and Structure
**Priority**: Medium  
**Status**: Proposed

The extraction script SHALL be located in a `/scripts` directory at the repository root and follow standard Node.js script conventions.

#### Scenario: Script is Executable via Node.js
**Given** Node.js is available in the environment  
**When** the command `node scripts/extract_globals.js` is executed  
**Then** the script runs successfully  
**And** produces the expected JSON output

#### Scenario: Script Accepts CLI Arguments
**Given** the script is invoked with `--source` and `--output` arguments  
**When** the script runs  
**Then** it reads from the specified source directory  
**And** writes to the specified output file path

## Implementation Notes

- Script should use simple regex patterns for robustness
- Node.js built-in fs module for file operations
- Performance target: Complete extraction in <5 seconds
- Script should be idempotent (safe to re-run)
- No external dependencies required beyond Node.js
