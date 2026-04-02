# Design: Track File Duplication Across Mods

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ModAnalyzer (main.mjs)                   │
│  ┌─────────────────────┐       ┌──────────────────────────┐    │
│  │   processFile()     │──────▶│  DuplicationTracker      │    │
│  │   - Extracts files  │       │  (singleton)             │    │
│  │   - Hashes content  │       │  - Registry: hash→mods   │    │
│  │   - Registers dupes │       │  - Metrics: bytes saved  │    │
│  └─────────────────────┘       └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              StatisticsTab (statistics-tab.mjs)                 │
│  ┌──────────────────────┐     ┌──────────────────────────┐     │
│  │ Session Statistics   │────▶│  Duplication Report      │     │
│  │ - Success rates      │     │  - Overview metrics      │     │
│  │ - Error distribution │     │  - Top duplicated files  │     │
│  │ - Processing times   │     │  - Drill-down by mod     │     │
│  └──────────────────────┘     │  - File preview          │     │
│                                └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. DuplicationTracker

**Location**: `src/web/js/duplication-tracker.mjs`

**Instantiation**: Created in ModAnalyzer constructor, passed to StatisticsTab

**Responsibilities**:
- Compute SHA-256 hashes for file content
- Maintain registry of hash → mod locations
- Calculate storage metrics and potential savings
- Provide query APIs for UI

**Data Structures**:

```javascript
class DuplicationTracker {
  // Map: fileHash (string) → FileInfo object
  fileRegistry: Map<string, FileInfo>
  
  // Cache computed metrics to avoid recalculation
  metricsCache: {
    totalDuplicatedBytes: number,
    potentialSavings: number,
    lastUpdated: timestamp
  }
}

interface FileInfo {
  hash: string,              // SHA-256 hex digest
  size: number,              // Bytes
  locations: Array<{         // Where this file appears
    modId: string,           // Mod identifier
    modName: string,         // Mod filename
    filePath: string         // Path within mod zip
  }>,
  content?: Uint8Array       // Optional: cached for preview
}
```

**Key Methods**:

```javascript
// Register a file from a mod
async registerFile(modId, modName, filePath, fileData, size)

// Remove all files from a mod (when mod removed from session)
unregisterMod(modId)

// Query duplicated files (sorted by various criteria)
getDuplicatedFiles(sortBy = 'count' | 'size' | 'impact')

// Get metrics
getMetrics() → { totalDuplicatedBytes, potentialSavings, duplicationRate, ... }

// Get file details including all locations
getFileDetails(hash) → FileInfo

// Clear all data
reset()
```

### 2. Hashing Strategy

**Choice: SHA-256 via Web Crypto API**

Rationale:
- **Standard**: Built into all modern browsers, hardware-accelerated
- **Fast**: ~100-200 MB/s on typical hardware
- **Collision-resistant**: Cryptographically secure (2^256 space)
- **Compatible**: Works with Uint8Array from JSZip

**Implementation**:

```javascript
async function computeHash(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Performance Considerations**:
- Hash files during initial zip extraction (already iterating files)
- Use async/await to avoid blocking UI thread
- Process files in small batches if needed (unlikely for typical mod sizes)

### 3. Integration with processFile()

**Modification to main.mjs**:

**Constructor**:
```javascript
class ModAnalyzer {
  constructor() {
    // ... existing initialization ...
    
    // Create duplication tracker instance
    this.duplicationTracker = new DuplicationTracker();
    
    // Tab modules
    this.tabs = {
      statistics: new StatisticsTab(this.duplicationTracker),
      // ... other tabs ...
    };
  }
}
```

**Processing**:
```javascript
async processFile(file) {
  // ... existing code ...
  
  // After zip extraction, hash and register files
  const zipArchive = await JSZip.loadAsync(arrayBuffer);
  
  for (const [path, zipEntry] of Object.entries(zipArchive.files)) {
    if (!zipEntry.dir) {
      const fileData = await zipEntry.async('uint8array');
      await this.duplicationTracker.registerFile(
        modId,
        file.name,
        path,
        fileData,
        fileData.length
      );
    }
  }
  
  // ... rest of processing ...
}
```

### 4. Statistics Tab UI Extension

**New Section**: "Duplication Report" (appears after existing charts)

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│ Duplication Report                                          │
├─────────────────────────────────────────────────────────────┤
│ Overview Metrics (Card Grid)                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Total    │ │ Potential│ │ Dup Rate │ │ Top File │        │
│ │ Duped    │ │ Savings  │ │          │ │          │        │
│ │ 12.4 MB  │ │ 10.1 MB  │ │ 23%      │ │ common.lua│       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Top Duplicated Files (Table)                                │
│ ┌─────────────────────┬──────┬────────┬─────────┬──────┐  │
│ │ File                │ Count│ Size   │ Impact  │ Action│  │
│ ├─────────────────────┼──────┼────────┼─────────┼──────┤  │
│ │ lib/common.lua      │  5   │ 2.3 KB │ 11.5 KB │ [📋] │  │
│ │ assets/sprite.png   │  3   │ 4.1 KB │ 12.3 KB │ [📋] │  │
│ │ ...                 │      │        │         │      │  │
│ └─────────────────────┴──────┴────────┴─────────┴──────┘  │
├─────────────────────────────────────────────────────────────┤
│ Drill-Down Panel (Shown when file selected)                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ File: lib/common.lua                                    │ │
│ │ Appears in: mod1.zip, mod2.zip, mod3.zip, mod4.zip      │ │
│ │                                                         │ │
│ │ [Preview Content]                                       │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ -- Common utility functions                         │ │ │
│ │ │ function deepcopy(orig)                             │ │ │
│ │ │   local copy                                        │ │ │
│ │ │   ...                                               │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Sorting Options**:
- By count (most duplicated)
- By total impact (count × size)
- By individual file size
- Alphabetically by filename

**Interactions**:
1. Click file row → Show drill-down panel with locations and preview
2. Click mod name in drill-down → Jump to that mod's file browser
3. Click [📋] icon → Copy file locations to clipboard
4. Export button → Generate CSV/XML with duplication data

### 5. File Preview Integration

**Reuse Existing Infrastructure**:
- Leverage `FilePreviewMixin` from file-browser-tab.mjs
- Use same syntax highlighting (highlight.js)
- Apply Lua globals highlighting if available

**Preview Panel**:
- Shows first 500 lines (configurable)
- Syntax highlighting based on file extension
- Click mod name → jump to file in that mod's browser
- Download button to save file locally

### 6. Export Format

**CSV Format**:
```csv
File Path,Hash,Size (bytes),Occurrences,Total Impact (bytes),Mods
lib/common.lua,a1b2c3d4...,2345,5,11725,"mod1.zip, mod2.zip, ..."
assets/sprite.png,e5f6g7h8...,4123,3,12369,"mod3.zip, mod4.zip, ..."
```

**XML Format**:
```xml
<duplication-report>
  <summary>
    <total-duplicated-bytes>12845056</total-duplicated-bytes>
    <potential-savings>10567234</potential-savings>
    <duplication-rate>0.23</duplication-rate>
  </summary>
  <files>
    <file>
      <path>lib/common.lua</path>
      <hash>a1b2c3d4...</hash>
      <size>2345</size>
      <occurrences>5</occurrences>
      <impact>11725</impact>
      <locations>
        <location mod="mod1.zip" path="lib/common.lua"/>
        <location mod="mod2.zip" path="lib/common.lua"/>
        ...
      </locations>
    </file>
  </files>
</duplication-report>
```

## Data Flow

### On Mod Processing

```
1. User drops mod.zip
2. main.mjs processes file
3. JSZip extracts all files
4. For each file:
   a. Compute SHA-256 hash (async)
   b. Call DuplicationTracker.registerFile(modId, modName, path, data, size)
   c. Tracker checks if hash exists
      - If new: Create FileInfo with single location
      - If exists: Add location to existing FileInfo
5. Continue with normal processing (WASM analysis, validation, etc.)
6. Statistics tab re-renders with updated duplication data
```

### On Mod Removal

```
1. User clears mod from session
2. main.mjs calls this.duplicationTracker.reset() (for full clear)
   or this.duplicationTracker.unregisterMod(modId) (for individual mod)
3. Tracker removes all locations matching modId
4. If FileInfo.locations becomes empty, delete FileInfo entry
5. Clear metrics cache to force recalculation
6. Statistics tab re-renders
```

### On Statistics Tab Render

```
1. Check if session has multiple mods (duplication requires ≥2 mods)
2. Query this.duplicationTracker.getDuplicatedFiles()
3. Query this.duplicationTracker.getMetrics()
4. Render overview cards with metrics
5. Render table with top 50 duplicated files (paginated if more)
6. Attach click handlers for drill-down
7. If file selected, render preview panel
```

## Performance Characteristics

### Time Complexity

- **registerFile()**: O(1) hash lookup + O(1) append location
- **getDuplicatedFiles()**: O(n) filter + O(n log n) sort (cached)
- **getMetrics()**: O(n) aggregation (cached, only recalc on changes)
- **unregisterMod()**: O(n) iteration to remove locations

### Space Complexity

- **Per unique file**: ~100 bytes (hash + metadata) + 8 bytes per location
- **Per mod**: ~(num_files × 100) bytes overhead
- **Example**: 10 mods, 50 files each, 30% duplication = ~40 KB

### Expected Performance

- **Typical mod (5 MB, 50 files)**: ~50ms hashing overhead
- **Large mod (50 MB, 500 files)**: ~200ms hashing overhead
- **Session with 20 mods**: ~2 seconds total hashing (one-time cost)
- **UI render**: <100ms for duplication report (even with large sessions)

## Error Handling

1. **Hash computation failure**: Log error, continue processing (skip file registration)
2. **Out of memory**: Provide clear session to free tracker data
3. **Invalid file data**: Skip registration, log warning
4. **Corrupt zip entries**: Handle at zip extraction level (existing error handling)

## Testing Strategy

1. **Unit tests** (if test infrastructure exists):
   - Hash computation correctness
   - Registry add/remove operations
   - Metrics calculation accuracy
   - Edge cases (empty files, large files, no duplicates)

2. **Manual testing**:
   - Process multiple mods with known duplicate files
   - Verify hash consistency across runs
   - Check drill-down navigation
   - Test export functionality
   - Verify memory usage stays reasonable

3. **Performance testing**:
   - Measure processing time impact (should be < 10%)
   - Test with large mods (100+ MB)
   - Test with many mods (50+ in session)
   - Monitor memory usage with browser DevTools

## Future Enhancements (Out of Scope)

1. **Persistent storage**: Save duplication data across sessions
2. **Similarity detection**: Find near-duplicates with fuzzy hashing
3. **Automatic extraction**: Generate library mod from duplicates
4. **Cross-session analytics**: Track duplication patterns over time
5. **Network sharing**: Compare against community database
