# Proposal: Fix File Dependency Hierarchy

## Problem Statement

The dependency graph currently displays all included Lua files as direct children of the mod entry point, creating a flat structure rather than representing the actual hierarchical include relationships.

**Current behavior:**
```
- entry.lua
  - guard.lua
  - helpers.lua
```

**Expected behavior:**
```
- entry.lua
  - guard.lua
    - helpers.lua
```

When `entry.lua` includes `guard.lua`, and `guard.lua` includes `helpers.lua`, the graph should reflect this chain of dependencies, not flatten all files to the same level.

## Root Cause

The Dart analyzer outputs a flat list of all included files in `resources.incs` without capturing which file includes which. The JavaScript frontend (`dependencies-tab.mjs`) receives this flat list and has no information about the parent-child relationships between files.

Since we cannot modify the Dart analyzer, the solution must:
1. Parse the actual Lua file content to detect `include()` calls
2. Build the hierarchical tree structure from these parsed relationships
3. Render the proper nested graph visualization

## Proposed Solution

Enhance the frontend to parse Lua files and extract `include()` calls to build an accurate dependency tree:

1. **Parse Lua files for includes**: When building the dependency graph, scan each `.lua` file's content to find `include()` function calls and extract the paths
2. **Build hierarchical structure**: Create a tree data structure that tracks parent-child relationships between files based on which file includes which
3. **Update graph rendering**: Modify the D3 force-directed graph to use hierarchical links instead of flat mod-to-file links
4. **Handle edge cases**: Detect and handle circular includes, missing files, and malformed paths

## Scope

**In scope:**
- Lua file content parsing for `include()` calls
- Hierarchical tree building from include relationships
- Updated D3 graph visualization with proper nesting
- Error handling for circular includes and missing files

**Out of scope:**
- Dart analyzer modifications (constraint: no backend changes)
- Changes to JSON output format
- Performance optimizations beyond basic caching
- Support for dynamic include paths (variables in include calls)

## User Impact

**Before:**
- Misleading flat dependency graph
- Cannot understand actual file inclusion order
- Difficult to trace dependency chains

**After:**
- Accurate hierarchical dependency visualization
- Clear understanding of which files depend on which
- Easier debugging of circular dependencies
- Better mod structure comprehension

## Implementation Complexity

**Medium complexity:**
- Requires regex-based Lua parsing (simple pattern matching for `include()` calls)
- Tree construction logic with cycle detection
- Graph layout adjustments for hierarchical display
- No WASM/Dart changes required (pure JavaScript)

## Dependencies

- Access to mod file contents (already available via `mod.fileData`)
- JSZip for reading file contents from the archive
- Existing D3.js graph rendering infrastructure

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Complex Lua parsing needed | Use simple regex for `include()` calls; handle 90% of cases |
| Performance with large file trees | Lazy parse on-demand; cache results |
| Circular includes | Existing cycle detection already in place |
| Dynamic include paths | Document limitation; only parse static strings |

## Success Metrics

- Dependency graph correctly displays nested file relationships
- Entry file is root, other files appear as descendants
- Circular includes are still detected and highlighted
- No performance regression on typical mods (<100 files)

## Open Questions

1. Should we show both the flat list (all includes) and hierarchical view?
2. How to handle `include()` calls with computed/dynamic paths?
3. Should we validate that parsed includes match `resources.incs`?
