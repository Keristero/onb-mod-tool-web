# Metadata Schema Extension

## MODIFIED Requirements

### Requirement: Version Metadata Structure
**Priority**: High  
**Status**: Proposed  
**Changes**: Added luaGlobals field to metadata schema

The metadata.json file SHALL be extended to include Lua globals information for the analyzer version.

#### Scenario: Metadata Includes Lua Globals Field
**Given** a metadata.json file is generated for an analyzer version  
**When** the file is read  
**Then** it contains a `luaGlobals` object at the root level  
**And** the object has `functions`, `tables`, and `variables` properties

#### Scenario: Functions Array Contains Global Function Names
**Given** the metadata.json contains luaGlobals data  
**When** accessing `luaGlobals.functions`  
**Then** it is an array of string function names  
**And** includes entries like "load_texture", "stream_music", "make_frame_data"

#### Scenario: Tables Object Maps Names to Fields
**Given** the metadata.json contains luaGlobals data  
**When** accessing `luaGlobals.tables`  
**Then** it is an object mapping table names to arrays of field names  
**And** includes entries like `{"Engine": ["load_texture", "load_audio", ...], "Element": ["Fire", "Aqua", ...]}`  
**And** Dart enum classes are included as tables with enum values as fields

#### Scenario: Variables Array Contains Global Variable Names
**Given** the metadata.json contains luaGlobals data  
**When** accessing `luaGlobals.variables`  
**Then** it is an array of string variable names  
**And** includes entries like "_modpath", "_folderpath"

#### Scenario: Schema is Backwards Compatible
**Given** an older metadata.json file without luaGlobals field exists  
**When** the web application loads the metadata  
**Then** the application handles the missing field gracefully  
**And** continues normal operation without globals highlighting

### Requirement: JSON Schema Validation
**Priority**: Medium  
**Status**: Proposed  
**Changes**: Define validation rules for luaGlobals structure

The luaGlobals data structure SHALL conform to a well-defined JSON schema.

#### Scenario: Required Fields Are Present
**Given** metadata.json contains a luaGlobals field  
**When** validating the structure  
**Then** all required properties (functions, tables, variables) are present  
**And** each property has the correct data type

#### Scenario: Function Names Are Unique
**Given** the luaGlobals.functions array  
**When** processing the data  
**Then** all function names are unique within the array

#### Scenario: Table Names Are Valid Identifiers
**Given** the luaGlobals.tables object  
**When** validating table names  
**Then** all keys are valid Lua identifiers  
**And** all field arrays contain valid identifier strings

## Schema Reference

```json
{
  "luaGlobals": {
    "functions": ["string", ...],
    "tables": {
      "TableName": ["fieldName", ...]
    },
    "enums": {
      "EnumName": ["Value", ...]
    },
    "variables": ["string", ...]
  }
}
```

## Implementation Notes

- Schema should be documented in metadata README
- Consider JSON Schema file for formal validation
- Keep schema extensible for future additions
