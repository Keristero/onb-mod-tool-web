# Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Build Process (Nix + mise)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. extract-globals task                                     │
│     └─> scripts/extract_globals.js                           │
│         └─> Analyzes: DartLangModTool/lib/src/lua/          │
│             visitors/bindings/*.dart                          │
│         └─> Outputs: versions/vX.X.X/metadata.json           │
│                       (with luaGlobals field)                 │
│                                                               │
│  2. build:web task (depends on extract-globals)              │
│     └─> Compiles WASM                                        │
│     └─> Packages with metadata                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Runtime (Web Interface)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  File Browser Tab                                            │
│  └─> Loads metadata.json for selected version               │
│  └─> Parses luaGlobals                                       │
│  └─> Enhances highlight.js output                            │
│      └─> Post-processes .hljs-name tokens                    │
│          └─> Matches against globals lookup                  │
│              └─> Adds .hljs-onb-global class                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Extract Globals Script (`/scripts/extract_globals.js`)

**Purpose**: Parse Dart source files to extract ONB Lua global definitions.

**Algorithm**:
```javascript
1. Read all *.dart files from lib/src/lua/visitors/bindings/
2. For each file:
   a. Find defGlobal() calls using regex
   b. Extract LuaObject type (func, table, variable, noSemantics)
   c. Parse identifier name
   d. For tables: extract field names
   e. For Dart enums: add to tables with enum values
3. Categorize into output structure
4. Serialize to JSON
5. Merge with existing metadata.json
```

**Key Patterns to Extract**:
```dart
// Functions
LuaFuncBuilder.create('function_name')
  => { "functions": ["function_name"] }

// Tables with fields
LuaObject.table('TableName', { 'field1': ..., 'field2': ... })
  => { "tables": { "TableName": ["field1", "field2"] } }

// Enums (Dart enum classes)
enum Elements { fire('Fire'), aqua('Aqua'), ... }
  => { "enums": { "Element": ["Fire", "Aqua", ...] } }

// Variables
LuaObject.variable('_modpath', ...)
  => { "variables": ["_modpath"] }

// No-semantics (treat as tables with unknown fields)
LuaObject.noSemantics('Battle')
  => { "tables": { "Battle": [] } }
```

**Input**: `src/DartLangModTool-master/lib/src/lua/visitors/bindings/`
**Output**: JSON merged into `web/versions/vX.X.X/metadata.json`

**Error Handling**:
- Skip unparseable patterns with warning
- Validate output JSON schema before writing
- Exit with error code if critical failures occur

### 2. Metadata Schema Extension

**Current Schema** (`versions/vX.X.X/metadata.json`):
```json
{
  "version": "1.0.0",
  "buildDate": "...",
  "dartVersion": "...",
  "features": [...]
}
```

**Extended Schema**:
```json
{
  "version": "1.0.0",
  "buildDate": "...",
  "dartVersion": "...",
  "features": [...],
  "luaGlobals": {
    "functions": [
      "load_texture",
      "load_audio",
      "stream_music",
      "make_frame_data",
      "make_animation_lockout",
      ...
    ],
    "tables": {
      "Engine": ["load_texture", "load_audio", "play_audio", ...],
      "Element": ["None", "Fire", "Aqua", "Elec", "Wood", ...],
      "CardClass": ["Standard", "Mega", "Giga", "Dark"],
      "Color": ["new", "fromHex", ...],
      "Direction": ["None", "Up", "Down", "Left", "Right", ...],
      "Tile": ["Normal", "Broken", "Cracked", ...],
      "TileState": ["Normal", "Broken", "Cracked", ...],
      "Rank": ["V1", "V2", "V3", "Sp", "Ex", ...],
      "Lifetimes": ["Local", "Battle", "UI"],
      "Blocks": ["White", "Red", "Green", "Blue", ...],
      ...
    },
    "variables": [
      "_modpath",
      "_folderpath"
    ]
  }
}
```

### 3. Mise Task Integration (`src/mise.toml`)

**New Task**:
```toml
[tasks."extract-globals"]
description = "Extract Lua globals from DartLangModTool source"
depends = ["setup"]
run = '''
#!/usr/bin/env bash
set -euo pipefail

VERSION=$(cat web/versions/latest/metadata.json | grep '"version"' | cut -d'"' -f4)
OUTPUT="web/versions/v${VERSION}/metadata.json"

echo "Extracting Lua globals for version ${VERSION}..."

# Run extraction script with Node.js
node scripts/extract_globals.js \
  --source="DartLangModTool-master/lib/src/lua/visitors/bindings" \
  --output="${OUTPUT}"

echo "✓ Globals extracted to ${OUTPUT}"
'''
```

**Modified Task**:
```toml
[tasks."build:web"]
description = "Build WebAssembly module and copy to web/versions/latest/"
depends = ["setup", "extract-globals"]  # Add dependency
# ... rest of task
```

### 4. Frontend Highlighting Enhancement

**File**: `web/js/tabs/file-browser-tab.mjs`

**New Module** (`web/js/utils/lua-globals.mjs`):
```javascript
export class LuaGlobalsHighlighter {
  constructor(metadata) {
    this.globals = this.buildGlobalsLookup(metadata.luaGlobals);
  }

  buildGlobalsLookup(luaGlobals) {
    const lookup = new Set();
    
    // Add functions
    luaGlobals.functions?.forEach(fn => lookup.add(fn));
    
    // Add table names and their fields
    Object.keys(luaGlobals.tables || {}).forEach(table => {
      lookup.add(table);
      // Optionally add table fields for member access highlighting
      // luaGlobals.tables[table]?.forEach(field => lookup.add(field));
    });
    
    // Add variables
    luaGlobals.variables?.forEach(v => lookup.add(v));
    
    return lookup;
  }

  enhanceHighlighting(codeElement) {
    // Find all identifier tokens
    const identifiers = codeElement.querySelectorAll('.hljs-name, .hljs-built_in');
    
    identifiers.forEach(token => {
      const text = token.textContent;
      
      // Check if identifier is an ONB global
      if (this.globals.has(text)) {
        token.classList.add('hljs-onb-global');
      }
      
      // Handle table member access (e.g., Element.Fire)
      const parent = token.parentElement;
      if (parent?.textContent.includes('.')) {
        const [table, member] = parent.textContent.split('.');
        if (this.globals.has(table)) {
          // Highlight table name
          const tableToken = parent.querySelector('.hljs-name');
          if (tableToken?.textContent === table) {
            tableToken.classList.add('hljs-onb-global');
          }
        }
      }
    });
  }
}
```

**Integration in FileBrowserTab**:
```javascript
import { LuaGlobalsHighlighter } from '../utils/lua-globals.mjs';

class FileBrowserTab extends BaseTab {
  async init() {
    // Load metadata for current analyzer version
    const metadata = await this.loadVersionMetadata();
    this.globalsHighlighter = new LuaGlobalsHighlighter(metadata);
  }
  
  async displayFileContent(filename, content) {
    // ... existing highlight.js processing ...
    
    // Post-process for ONB globals
    if (filename.endsWith('.lua')) {
      this.globalsHighlighter.enhanceHighlighting(codeElement);
    }
  }
}
```

**CSS** (`web/css/styles.css`):
```css
/* ONB-specific global highlighting */
.hljs-onb-global {
  color: #00d9ff; /* Bright cyan/teal */
  font-weight: 500;
}

/* Dark theme variant */
@media (prefers-color-scheme: dark) {
  .hljs-onb-global {
    color: #4dffff; /* Lighter cyan for dark backgrounds */
  }
}
```

## Data Flow

```
Build Time:
  DartLangModTool source
    → extract_globals.dart
      → Parse bindings/*.dart
        → Extract patterns
          → Generate JSON
            → Merge into metadata.json
              → Packaged with WASM build

Runtime:
  User selects analyzer version
    → Load metadata.json
      → Parse luaGlobals
        → Build lookup set
          → User opens .lua file
            → highlight.js processes
              → Post-process with globals
                → Apply .hljs-onb-global class
                  → Render with distinct color
```

## Performance Considerations

1. **Build Time**: Script adds ~2-5 seconds to build process (acceptable)
2. **Runtime Parsing**: Metadata loaded once per version selection (cached)
3. **Highlighting**: Post-processing is O(n) on token count (fast for typical files)
4. **Memory**: Globals lookup set is <10KB per version (negligible)

## Backwards Compatibility

- Old metadata.json files without `luaGlobals` field still work
- Frontend gracefully handles missing field (no globals highlighting)
- No breaking changes to existing APIs or interfaces

## Testing Strategy

1. **Unit Tests** (manual for Dart script):
   - Extract known globals from sample Dart code
   - Validate JSON schema output
   
2. **Integration Tests** (manual):
   - Run full build pipeline
   - Verify metadata.json contains expected globals
   
3. **End-to-End Tests** (manual):
   - Load mod with Lua files
   - Verify globals are highlighted correctly
   - Test across multiple analyzer versions
   
4. **Visual Verification**:
   - Compare highlighted code against DartLangModTool source
   - Ensure color is distinct and readable

## Alternative Approaches Considered

### Alternative 1: Runtime Reflection from WASM
**Rejected**: Would require modifying DartLangModTool to expose globals API, violating "no modifications" constraint.

### Alternative 2: Manual JSON Maintenance
**Rejected**: High maintenance burden, error-prone, not future-proof.

### Alternative 3: Parse Lua at Runtime
**Rejected**: Cannot determine what's an ONB global vs. user-defined without static metadata.

## Future Enhancements (Out of Scope)

- Autocomplete suggestions based on globals
- Hover documentation for globals
- Function signature hints
- Deep parsing of table field availability per context
