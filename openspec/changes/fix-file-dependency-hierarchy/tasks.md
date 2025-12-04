# Tasks: Fix File Dependency Hierarchy

## Phase 1: File Content Access (2 tasks)

- [x] **Add file content extraction utility**
  - Create `getFileContent(mod, filePath)` function in `dependencies-tab.mjs`
  - Use JSZip to read file from `mod.fileData`
  - Handle missing files gracefully (return null)
  - Test with valid and invalid file paths

- [x] **Add caching mechanism for file contents**
  - Create `this.fileContentCache` Map to cache loaded files
  - Key: `${modId}/${filePath}`
  - Clear cache when mod is re-processed
  - Test cache hit/miss performance

## Phase 2: Lua Include Parsing (3 tasks)

- [x] **Implement basic include parser**
  - Create `parseIncludesFromLua(content)` function
  - Use regex to match `include("path")` and `include('path')`
  - Return array of extracted file paths
  - Test with sample Lua files

- [x] **Handle edge cases in parsing**
  - Add support for long string syntax `include [[path]]`
  - Filter out commented includes (lines starting with `--`)
  - Handle whitespace variations in include calls
  - Test with edge case examples

- [x] **Add parsing error handling**
  - Catch and log malformed include statements
  - Continue parsing even if some includes fail
  - Track unparseable includes for debugging
  - Test with intentionally malformed input

## Phase 3: Tree Structure Building (4 tasks)

- [x] **Implement file tree builder**
  - Create `buildFileTree(mod, entryFile)` async function
  - Use recursive traversal starting from entry file
  - Build tree structure with `{path, children}` nodes
  - Test with simple two-level hierarchy

- [x] **Add circular dependency detection**
  - Track visited files with Set during traversal
  - Stop recursion when circular reference detected
  - Mark nodes involved in cycles
  - Test with intentional circular includes

- [x] **Handle missing included files**
  - Check if included file exists before traversing
  - Create placeholder nodes for missing files
  - Mark missing files for visual indication
  - Test with includes to non-existent files

- [x] **Add tree caching**
  - Create `this.fileTreeCache` Map to cache built trees
  - Cache trees per mod to avoid re-parsing
  - Clear cache on mod updates
  - Test cache effectiveness with multiple renders

## Phase 4: Graph Data Transformation (3 tasks)

- [x] **Convert tree to D3 graph format**
  - Create `treeToGraphData(tree, parentModId)` function
  - Traverse tree and generate flat nodes array
  - Generate links array with parent-child relationships
  - Test output structure matches D3 requirements

- [x] **Update node creation logic**
  - Modify node objects to include hierarchy depth
  - Add `parentFileId` field to track parent file
  - Preserve existing node properties for compatibility
  - Test nodes render correctly in graph

- [x] **Update link creation logic**
  - Change link type from `'contains'` to `'file-include'`
  - Link files to their immediate parent file, not mod
  - Keep mod-to-entry-file link as root
  - Test links create proper tree structure

## Phase 5: Graph Visualization Updates (4 tasks)

- [x] **Integrate tree building into buildGraph()**
  - Call `buildFileTree()` for each mod before creating nodes
  - Replace flat file iteration with tree-based approach
  - Maintain backward compatibility for mods without files
  - Test with file and session views

- [x] **Update D3 force simulation parameters**
  - Adjust link distance for hierarchical layout
  - Modify charge strength for better tree spacing
  - Add Y-axis force to create top-down layout (optional)
  - Test visual appearance and readability

- [x] **Update link styling for hierarchy**
  - Use solid lines for `file-include` type links
  - Differentiate from mod `contains` links (dashed)
  - Apply green color for file includes (existing)
  - Test visual distinction between link types

- [x] **Update info display with tree metrics**
  - Calculate and display tree depth (max nesting level)
  - Show total files vs unique files in tree
  - Display circular include count separately
  - Test statistics accuracy

## Phase 6: Testing and Refinement (4 tasks)

- [x] **Test with sample mod - simple hierarchy**
  - Use mod with 3 files: entry -> guard -> helpers
  - Verify tree structure: entry (root) -> guard (child) -> helpers (grandchild)
  - Check visual layout shows proper nesting
  - Confirm no regressions in other tabs

- [x] **Test with circular includes**
  - Create/use mod with circular include (a->b->a)
  - Verify cycle is detected and highlighted
  - Check graph doesn't infinite loop
  - Confirm error display is clear

- [x] **Test with missing files**
  - Use mod that includes non-existent file
  - Verify placeholder node is created
  - Check visual indication of missing file
  - Confirm no JavaScript errors

- [x] **Performance testing**
  - Test with mod containing 50+ files
  - Measure parsing time (target <500ms)
  - Check graph render performance
  - Profile and optimize if needed

## Phase 7: Documentation and Polish (2 tasks)

- [x] **Add code comments and documentation**
  - Document new functions with JSDoc
  - Explain regex patterns in include parser
  - Add comments for complex tree traversal logic
  - Document known limitations (dynamic includes)

- [x] **Update user-facing messages**
  - Update empty state message to mention "file hierarchy"
  - Add tooltip explaining hierarchical view
  - Update legend if new visual elements added
  - Review all user-visible text for clarity

## Total: 22 tasks

**Estimated effort:** 2-3 days
**Dependencies:** JSZip (already available), D3.js (already available)
**Risk level:** Medium (parsing logic, graph layout changes)
**Status:** ✅ Completed
