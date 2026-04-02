# Capability: Duplication Tracker

## Overview

This capability provides a singleton service that tracks file duplication across all mods processed in a session. It maintains a registry of file hashes and their locations, computes storage metrics, and provides query APIs for the UI layer.

## ADDED Requirements

### Requirement: Maintain duplication registry state

The system shall provide a DuplicationTracker class that can be instantiated and maintains file duplication state throughout the session.

**Priority**: P0 (blocking)  
**Dependencies**: None

#### Scenario: Create tracker instance

**Given** a need to track file duplication  
**When** `new DuplicationTracker()` is called  
**Then** it returns a new DuplicationTracker instance  
**And** the instance has an empty file registry  
**And** metrics are initialized to zero

#### Scenario: Reset tracker state

**Given** a DuplicationTracker instance with registered files  
**When** `reset()` is called  
**Then** all file registry data is cleared  
**And** metrics are reset to zero  
**And** subsequent queries return empty results

### Requirement: Register file with hash and location

The system shall accept file registration including mod ID, mod name, file path, content hash, and size, and maintain a mapping from hash to all locations where that file appears.

**Priority**: P0 (blocking)  
**Dependencies**: file-hash-computation capability

#### Scenario: Register first occurrence of a file

**Given** an empty file registry  
**When** `registerFile(modId: "mod1", modName: "test.zip", path: "lib/common.lua", hash: "abc123", size: 2048)` is called  
**Then** a new FileInfo entry is created with hash "abc123"  
**And** the entry contains one location: {modId: "mod1", modName: "test.zip", filePath: "lib/common.lua"}  
**And** the entry records size as 2048 bytes

#### Scenario: Register duplicate file in different mod

**Given** file "abc123" already registered from mod1  
**When** `registerFile(modId: "mod2", modName: "other.zip", path: "utils/common.lua", hash: "abc123", size: 2048)` is called  
**Then** the existing FileInfo for "abc123" is updated  
**And** the locations array now contains two entries (mod1 and mod2)  
**And** the file is marked as duplicated (locations.length > 1)

#### Scenario: Register same file twice in same mod

**Given** file "abc123" already registered from mod1 at path "lib/common.lua"  
**When** `registerFile(modId: "mod1", modName: "test.zip", path: "lib/common.lua", hash: "abc123", size: 2048)` is called again  
**Then** the location is not duplicated in the locations array  
**And** no additional entry is added (idempotent)

### Requirement: Compute duplication metrics

The system shall calculate aggregate metrics including total duplicated bytes, potential storage savings, and duplication rate.

**Priority**: P0 (blocking)  
**Dependencies**: None

#### Scenario: Calculate metrics with duplicates

**Given** file "hash1" (size: 1024) appears in 3 mods  
**And** file "hash2" (size: 2048) appears in 2 mods  
**When** `getMetrics()` is called  
**Then** totalDuplicatedBytes = (1024 × 3) + (2048 × 2) = 7168  
**And** potentialSavings = (1024 × 2) + (2048 × 1) = 4096 (saved if deduplicated)  
**And** uniqueFiles = 2  
**And** duplicatedFiles = 2

#### Scenario: Calculate metrics with no duplicates

**Given** 5 files each appearing in only 1 mod  
**When** `getMetrics()` is called  
**Then** totalDuplicatedBytes = (sum of all file sizes)  
**And** potentialSavings = 0  
**And** duplicatedFiles = 0  
**And** duplicationRate = 0.0

### Requirement: Query duplicated files with sorting

The system shall provide a method to retrieve all duplicated files (appearing in 2+ mods) sorted by various criteria.

**Priority**: P0 (blocking)  
**Dependencies**: None

#### Scenario: Get duplicated files sorted by occurrence count

**Given** file "hash1" appears in 5 mods  
**And** file "hash2" appears in 3 mods  
**And** file "hash3" appears in 2 mods  
**When** `getDuplicatedFiles(sortBy: 'count')` is called  
**Then** it returns an array of FileInfo objects  
**And** the order is [hash1, hash2, hash3] (descending by count)

#### Scenario: Get duplicated files sorted by storage impact

**Given** file "hash1" (size: 1KB, count: 5, impact: 5KB)  
**And** file "hash2" (size: 10KB, count: 2, impact: 20KB)  
**When** `getDuplicatedFiles(sortBy: 'impact')` is called  
**Then** the order is [hash2, hash1] (descending by size × count)

#### Scenario: No duplicated files returns empty array

**Given** all files appear in only 1 mod each  
**When** `getDuplicatedFiles()` is called  
**Then** it returns an empty array

### Requirement: Retrieve file details by hash

The system shall allow querying full details of a specific file by its hash, including all locations and metadata.

**Priority**: P0 (blocking)  
**Dependencies**: None

#### Scenario: Get details for existing file

**Given** file "abc123" is registered with 3 locations  
**When** `getFileDetails("abc123")` is called  
**Then** it returns a FileInfo object with hash "abc123"  
**And** the object contains all 3 locations with mod IDs, names, and file paths  
**And** the object includes the file size

#### Scenario: Get details for non-existent hash

**Given** no file with hash "nonexistent"  
**When** `getFileDetails("nonexistent")` is called  
**Then** it returns null or undefined  
**And** no error is thrown

### Requirement: Unregister all files from a mod

The system shall remove all file registrations associated with a specific mod ID when that mod is removed from the session.

**Priority**: P0 (blocking)  
**Dependencies**: None

#### Scenario: Unregister mod with unique files

**Given** mod1 has 3 files with unique hashes (no duplicates)  
**When** `unregisterMod("mod1")` is called  
**Then** all 3 FileInfo entries are deleted from the registry  
**And** subsequent queries for those hashes return null

#### Scenario: Unregister mod with shared files

**Given** file "hash1" appears in mod1 and mod2  
**And** file "hash2" appears only in mod1  
**When** `unregisterMod("mod1")` is called  
**Then** "hash1" FileInfo still exists but only contains mod2 location  
**And** "hash2" FileInfo is completely removed  
**And** metrics are recalculated to reflect the removal

#### Scenario: Unregister non-existent mod is idempotent

**Given** no files registered for "nonexistent-mod"  
**When** `unregisterMod("nonexistent-mod")` is called  
**Then** no error is thrown  
**And** the registry remains unchanged

### Requirement: Cache computed metrics for performance

The system shall cache aggregated metrics and only recalculate when the registry changes (file added/removed).

**Priority**: P1 (important)  
**Dependencies**: None

#### Scenario: Metrics cached after first computation

**Given** 100 files registered across 10 mods  
**When** `getMetrics()` is called the first time  
**Then** metrics are computed from scratch  
**And** when `getMetrics()` is called a second time immediately  
**Then** the cached result is returned without recomputation  
**And** the second call completes in < 1ms

#### Scenario: Metrics cache invalidated on registry change

**Given** cached metrics from previous computation  
**When** `registerFile()` is called to add a new file  
**Then** the metrics cache is invalidated  
**And** the next `getMetrics()` call recomputes from current state

## Implementation Notes

**Module Location**: `src/web/js/duplication-tracker.mjs`

**API Surface**:
```javascript
class DuplicationTracker {
  constructor();
  
  async registerFile(
    modId: string,
    modName: string, 
    filePath: string,
    hash: string,
    size: number
  ): Promise<void>;
  
  unregisterMod(modId: string): void;
  
  getDuplicatedFiles(
    sortBy?: 'count' | 'size' | 'impact'
  ): FileInfo[];
  
  getMetrics(): {
    totalDuplicatedBytes: number,
    potentialSavings: number,
    uniqueFiles: number,
    duplicatedFiles: number,
    duplicationRate: number
  };
  
  getFileDetails(hash: string): FileInfo | null;
  
  reset(): void;
}

interface FileInfo {
  hash: string;
  size: number;
  locations: Array<{
    modId: string;
    modName: string;
    filePath: string;
  }>;
}
```

**Memory Considerations**: 
- Store only hashes and references, not file contents (except for preview)
- Expected overhead: ~100 bytes per unique file + 8 bytes per location
