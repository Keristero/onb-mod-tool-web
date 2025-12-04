# Spec Delta: Dependency Visualization

## MODIFIED Requirements

### Requirement: Display hierarchical file include relationships

The dependency graph SHALL accurately represent the parent-child relationships between Lua files based on `include()` calls, showing which file includes which in a nested tree structure.

**Status:** Modified - Previously showed flat structure, now hierarchical

#### Scenario: Single-level file inclusion

**Given** a mod with `entry.lua` that includes `helper.lua`  
**When** the user views the dependencies tab  
**Then** the graph shows `entry.lua` as root with `helper.lua` as a direct child  
**And** a directed edge connects `entry.lua` → `helper.lua`  
**And** `helper.lua` is not shown as a direct child of the mod node

#### Scenario: Multi-level file inclusion hierarchy

**Given** a mod where:
- `entry.lua` includes `guard.lua`
- `guard.lua` includes `helpers.lua`

**When** the user views the dependencies tab  
**Then** the graph shows:
- `entry.lua` at the top level (connected to mod)
- `guard.lua` as a child of `entry.lua`
- `helpers.lua` as a child of `guard.lua`

**And** edges are: `mod → entry.lua → guard.lua → helpers.lua`  
**And** no direct edge exists from `entry.lua` to `helpers.lua`

#### Scenario: File included by multiple parents

**Given** a mod where:
- `entry.lua` includes `utils.lua`
- `guard.lua` includes `utils.lua`

**When** the user views the dependencies tab  
**Then** `utils.lua` appears as a child of both `entry.lua` and `guard.lua`  
**And** two separate nodes exist for each inclusion context  
**Or** a single node with multiple incoming edges if using shared node approach

#### Scenario: Circular file includes

**Given** a mod where:
- `a.lua` includes `b.lua`
- `b.lua` includes `a.lua`

**When** the user views the dependencies tab  
**Then** both files are shown in the graph  
**And** a circular edge indicator is displayed  
**And** the cycle is highlighted in red (existing behavior)  
**And** the "Circular Dependencies" warning lists the cycle

---

## ADDED Requirements

### Requirement: Parse Lua file content for include statements

The system SHALL parse Lua file content to extract `include()` function calls and identify which files are included by each file.

**Status:** Added - New capability

#### Scenario: Parse simple include statement

**Given** a Lua file containing `include("helpers.lua")`  
**When** the file is parsed  
**Then** `"helpers.lua"` is extracted as an included file  
**And** the path is stored for tree building

#### Scenario: Parse include with single quotes

**Given** a Lua file containing `include('guard.lua')`  
**When** the file is parsed  
**Then** `"guard.lua"` is extracted as an included file

#### Scenario: Parse include with Lua long string

**Given** a Lua file containing `include [[utils.lua]]`  
**When** the file is parsed  
**Then** `"utils.lua"` is extracted as an included file

#### Scenario: Ignore commented includes

**Given** a Lua file containing `-- include("old.lua")`  
**When** the file is parsed  
**Then** no include is extracted from the commented line  
**And** only non-commented includes are returned

#### Scenario: Handle multiple includes in one file

**Given** a Lua file containing:
```lua
include("a.lua")
include("b.lua")
include("c.lua")
```

**When** the file is parsed  
**Then** all three files `["a.lua", "b.lua", "c.lua"]` are extracted  
**And** the order is preserved

#### Scenario: Handle whitespace variations

**Given** a Lua file containing `include(  "spaced.lua"  )`  
**When** the file is parsed  
**Then** `"spaced.lua"` is correctly extracted  
**And** extra whitespace is ignored

---

### Requirement: Build file dependency tree from parsed includes

The system SHALL construct a hierarchical tree structure representing file inclusion relationships, starting from the entry file and recursively traversing includes.

**Status:** Added - New capability

#### Scenario: Build simple two-level tree

**Given** a mod with files:
- `entry.lua` includes `helper.lua`
- `helper.lua` includes nothing

**When** the file tree is built  
**Then** the tree structure is:
```
{
  path: "entry.lua",
  children: [
    { path: "helper.lua", children: [] }
  ]
}
```

#### Scenario: Build multi-level tree

**Given** a mod with files:
- `entry.lua` includes `guard.lua`
- `guard.lua` includes `helpers.lua`
- `helpers.lua` includes nothing

**When** the file tree is built  
**Then** the tree structure is:
```
{
  path: "entry.lua",
  children: [
    {
      path: "guard.lua",
      children: [
        { path: "helpers.lua", children: [] }
      ]
    }
  ]
}
```

#### Scenario: Detect circular includes during tree building

**Given** a mod with files:
- `a.lua` includes `b.lua`
- `b.lua` includes `a.lua`

**When** the file tree is built  
**Then** the tree traversal detects the cycle  
**And** recursion stops to prevent infinite loop  
**And** the cycle is marked for visual indication

#### Scenario: Handle missing included file

**Given** a mod where `entry.lua` includes `missing.lua`  
**And** `missing.lua` does not exist in the archive  
**When** the file tree is built  
**Then** a placeholder node is created for `missing.lua`  
**And** the node is marked as `hasData: false`  
**And** no children are added to the missing file node

---

### Requirement: Cache parsed file trees for performance

The system SHALL cache built file trees to avoid re-parsing Lua files on every render, improving performance for large mods.

**Status:** Added - New capability

#### Scenario: Cache file tree on first build

**Given** a mod has been processed  
**And** the dependency tab is rendered for the first time  
**When** the file tree is built  
**Then** the tree is stored in cache with key `${modId}`  
**And** subsequent renders use the cached tree

#### Scenario: Invalidate cache on mod update

**Given** a mod has a cached file tree  
**And** the mod is re-processed  
**When** the new analysis completes  
**Then** the cached tree is invalidated  
**And** the next render rebuilds the tree from updated files

#### Scenario: Cache improves render performance

**Given** a mod with 50 Lua files has been rendered once  
**When** the user switches back to the dependencies tab  
**Then** the graph renders in <50ms using cached tree  
**And** no file parsing occurs

---

### Requirement: Extract file content from mod archive

The system SHALL read Lua file content from the mod ZIP archive to enable parsing of include statements.

**Status:** Added - New capability

#### Scenario: Read existing file from archive

**Given** a mod ZIP containing `entry.lua`  
**When** file content is requested for `entry.lua`  
**Then** the file content is extracted from the ZIP  
**And** returned as a UTF-8 string

#### Scenario: Handle missing file gracefully

**Given** a mod ZIP that does not contain `missing.lua`  
**When** file content is requested for `missing.lua`  
**Then** `null` is returned  
**And** no error is thrown

#### Scenario: Read nested file path

**Given** a mod ZIP containing `scripts/battle/guard.lua`  
**When** file content is requested for `scripts/battle/guard.lua`  
**Then** the nested file is correctly located  
**And** its content is returned

---

## REMOVED Requirements

None - This change only adds functionality and improves existing visualization, with no removals.

---

## Cross-References

**Related Changes:**
- None (standalone improvement)

**Related Capabilities:**
- File browser tab (shares file content extraction)
- Error visualization (may benefit from hierarchy info)

**Dependencies:**
- JSZip library (already integrated)
- D3.js force-directed graph (already integrated)
- Existing cycle detection logic (reused)
