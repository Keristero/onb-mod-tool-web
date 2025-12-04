# Design: Fix File Dependency Hierarchy

## Architecture Overview

This change enhances the dependency visualization by parsing Lua file contents to extract `include()` relationships and building a proper hierarchical tree, all within the JavaScript frontend.

## Component Design

### 1. Include Parser Module

**Location:** New utility in `dependencies-tab.mjs` or separate `include-parser.mjs`

**Responsibility:** Parse Lua file content to extract `include()` calls

```javascript
// Pseudo-code
function parseIncludesFromLua(luaContent) {
  // Match: include("path"), include('path'), include [[path]]
  const includeRegex = /include\s*\(\s*["']([^"']+)["']\s*\)/g;
  const includes = [];
  let match;
  while ((match = includeRegex.exec(luaContent)) !== null) {
    includes.push(match[1]);
  }
  return includes;
}
```

**Input:** Lua file content as string  
**Output:** Array of included file paths

### 2. File Content Extractor

**Location:** Extension of existing file reading in `dependencies-tab.mjs`

**Responsibility:** Extract file contents from mod ZIP archive

```javascript
// Pseudo-code
async function getFileContent(mod, filePath) {
  const zip = await JSZip.loadAsync(mod.fileData);
  const file = zip.file(filePath);
  if (!file) return null;
  return await file.async('text');
}
```

**Input:** Mod object with `fileData`, file path  
**Output:** File content string or null

### 3. Dependency Tree Builder

**Location:** New function in `dependencies-tab.mjs`

**Responsibility:** Build hierarchical tree from parsed includes

```javascript
// Pseudo-code
async function buildFileTree(mod, entryFile = 'entry.lua') {
  const visited = new Set();
  const tree = { path: entryFile, children: [] };
  
  async function traverse(node, currentPath) {
    if (visited.has(currentPath)) {
      // Circular dependency
      return;
    }
    visited.add(currentPath);
    
    const content = await getFileContent(mod, currentPath);
    if (!content) return;
    
    const includes = parseIncludesFromLua(content);
    for (const includePath of includes) {
      const childNode = { path: includePath, children: [] };
      node.children.push(childNode);
      await traverse(childNode, includePath);
    }
  }
  
  await traverse(tree, entryFile);
  return tree;
}
```

**Input:** Mod object, entry file path  
**Output:** Tree structure with nested children

### 4. Graph Data Transformer

**Location:** Modified `buildGraph()` in `dependencies-tab.mjs`

**Responsibility:** Convert file tree to D3 nodes and links

```javascript
// Pseudo-code
function treeToGraphData(tree, parentModId) {
  const nodes = [];
  const links = [];
  
  function traverse(node, parent) {
    const nodeId = `${parentModId}/${node.path}`;
    nodes.push({
      id: nodeId,
      name: node.path.split('/').pop(),
      fullPath: node.path,
      type: 'file',
      hasData: true,
      parentMod: parentModId
    });
    
    if (parent) {
      links.push({
        source: parent,
        target: nodeId,
        type: 'file-include'
      });
    }
    
    node.children.forEach(child => traverse(child, nodeId));
  }
  
  traverse(tree, parentModId);
  return { nodes, links };
}
```

**Input:** Tree structure, parent mod ID  
**Output:** Flat arrays of nodes and links for D3

## Data Flow

```
1. User processes mod
   ↓
2. Mod ZIP loaded into memory (existing)
   ↓
3. buildGraph() called
   ↓
4. For each mod:
   a. Build file tree from entry.lua
   b. Parse each file for include() calls
   c. Recursively build tree structure
   ↓
5. Convert tree to D3 graph data
   ↓
6. Render with D3 force layout (existing)
```

## Edge Cases

### 1. Circular Includes
**Example:** `a.lua` includes `b.lua`, `b.lua` includes `a.lua`

**Handling:**
- Track visited files during tree traversal
- Stop recursion when circular reference detected
- Add special cycle indicator to graph data
- Highlight with red link (existing cycle detection)

### 2. Missing Files
**Example:** `include("missing.lua")` but file doesn't exist

**Handling:**
- Return null from `getFileContent()`
- Create placeholder node with `hasData: false`
- Style as external/missing dependency (existing pattern)

### 3. Dynamic Paths
**Example:** `include(someVariable)` or `include("path/" .. name)`

**Handling:**
- Simple regex won't match these
- Document as limitation
- Fall back to flat list from `resources.incs`

### 4. Multiple Include Formats
**Example:** `include("path")`, `include('path')`, `include [[path]]`

**Handling:**
- Regex covers quoted strings: `["']([^"']+)["']`
- Add support for Lua long strings: `\[\[([^\]]+)\]\]`
- Test with real mod examples

### 5. Comments in Code
**Example:** `-- include("old.lua")` should be ignored

**Handling:**
- Extend regex to exclude commented lines
- Pattern: `^[^-]*include\s*\(`
- Or pre-strip comments before parsing

## Performance Considerations

### Caching Strategy
- Cache parsed file trees per mod
- Invalidate on mod re-analysis
- Store in `this.fileTreeCache` Map

### Lazy Loading
- Only parse files when dependency tab is active
- Parse on-demand when graph is first rendered
- Show loading indicator during parsing

### Optimization Targets
- Small mods (<10 files): <50ms parsing
- Medium mods (10-50 files): <200ms parsing
- Large mods (50-100 files): <500ms parsing

## Integration Points

### Modified Functions
1. `buildGraph(mode, modsToProcess)` - Add file tree building before D3 rendering
2. `renderD3Graph()` - Use hierarchical links instead of flat containment links
3. `displayInfo()` - Update statistics to show tree depth

### New Functions
1. `parseIncludesFromLua(content)` - Extract include calls
2. `getFileContent(mod, path)` - Read file from ZIP
3. `buildFileTree(mod, entryPath)` - Build tree structure
4. `treeToGraphData(tree, modId)` - Convert to D3 format

### Unchanged Functions
- `detectCycles()` - Still works with flat nodes/links
- `exportPNG()` / `exportJSON()` - No changes needed
- `handleNodeClick()` - Still navigates to files

## Testing Strategy

### Unit Testing Scenarios
1. Parse simple `include("file.lua")` 
2. Parse with single quotes `include('file.lua')`
3. Handle commented includes
4. Detect circular references
5. Handle missing files

### Integration Testing
1. Load real mod with known include chain
2. Verify tree structure matches manual inspection
3. Check graph visualization shows hierarchy
4. Confirm circular includes still detected
5. Test with mod containing 50+ files

### Manual Testing
1. Visual inspection of sample mods
2. Compare old flat view vs new hierarchical view
3. Verify click-to-navigate still works
4. Check export functions produce valid output

## Rollback Plan

If issues arise:
1. Add feature flag: `USE_HIERARCHICAL_DEPS`
2. Keep old flat rendering as fallback
3. Allow users to toggle between views
4. Gather feedback before removing old code

## Future Enhancements

(Out of scope for this change)
1. Show both flat and hierarchical views side-by-side
2. Support dynamic include path resolution
3. Validate parsed includes against `resources.incs`
4. Add include path normalization (handle `./` and `../`)
5. Interactive tree collapse/expand in graph
