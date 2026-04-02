# Metadata Extraction Specification Delta

## ADDED Requirements

### Requirement: Common Method Detection
The extraction script SHALL automatically identify methods that appear in multiple object types and classify them as "Common" methods.

#### Scenario: Detecting shared methods across types
**Given** the extraction script processes Dart files containing:
- `useBlockPackage()` returning `{'set_name': ...}`
- `useMobPackage()` returning `{'set_name': ...}`
- `usePlayerPackage()` returning `{'set_name': ...}`

**When** the script completes extraction

**Then** the output metadata SHALL include:
```json
{
  "objectMethods": {
    "Common": ["set_name"],
    "Block": [...other block-only methods],
    "Mob": [...other mob-only methods],
    "Player": [...other player-only methods]
  }
}
```

**And** `set_name` SHALL NOT appear in the Block, Mob, or Player arrays

#### Scenario: Preserving type-specific methods
**Given** a method `create_spawner` appears only in `useMobPackage()`

**When** the extraction runs

**Then** `create_spawner` SHALL remain in the "Mob" array only
**And** `create_spawner` SHALL NOT appear in "Common"

#### Scenario: Configurable threshold
**Given** the extraction script has a configuration option `commonMethodThreshold`

**When** `commonMethodThreshold` is set to 2

**Then** methods appearing in 2 or more types SHALL be classified as Common
**And** methods appearing in only 1 type SHALL remain type-specific

### Requirement: Method Sharing Metadata
The extraction script SHALL generate metadata tracking which object types share each common method.

#### Scenario: Recording method provenance
**Given** `set_name` appears in Block, Mob, Player, and Common sources

**When** the extraction completes

**Then** the metadata SHALL include:
```json
{
  "methodSharing": {
    "set_name": ["Block", "Mob", "Player"]
  }
}
```

**Note**: This enables tooltips to display accurate sharing information even after deduplication.

## MODIFIED Requirements

### Requirement: Object Method Collection
The extraction script SHALL deduplicate methods across object types before serialization.

**Previous behavior**: Methods were collected per-type without deduplication
**New behavior**: Methods are analyzed for cross-type occurrence and deduplicated

#### Scenario: Modified serialization output
**Given** methods have been collected from all Dart files

**When** `serializeCollector()` is called

**Then** the output SHALL:
1. Calculate method occurrence counts across types
2. Extract common methods (based on threshold)
3. Remove common methods from type-specific arrays
4. Merge common methods with existing "Common" entries
5. Generate `methodSharing` mapping for provenance tracking
