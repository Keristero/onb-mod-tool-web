# Track File Duplication Across Mods

## Problem Statement

Mod creators frequently reuse common code libraries and assets across multiple mods, leading to significant file duplication. Currently, there is no visibility into:

1. **Which files are duplicated** across different mod packages
2. **How much storage** is wasted due to duplication
3. **Where duplicates appear** (which mods contain the same files)
4. **What the duplicated files contain** (ability to preview and verify they're truly identical)

This lack of visibility makes it difficult to:
- Identify opportunities for extracting shared libraries
- Justify the introduction of a library mod type for code reuse
- Quantify the storage and distribution benefits of library extraction
- Make data-driven decisions about mod architecture

## Current State

The mod analyzer processes each mod independently and tracks:
- File structure via `zipArchive` (JSZip object)
- File sizes and basic metadata
- Session-level statistics (success rates, error counts, processing times)

However, there is **no cross-mod file analysis** or deduplication tracking.

## Proposed Solution

Introduce a **DuplicationTracker singleton** that:
1. Computes content hashes (SHA-256) for every file in every processed mod
2. Maintains a registry of file hashes → mod locations
3. Tracks storage metrics (total duplicated bytes, potential savings)
4. Provides querying APIs for the UI layer

Add a **new "Duplication" report section** to the Session Statistics tab that displays:
1. **Overview metrics**: Total duplicated bytes, potential savings, duplication rate
2. **Top duplicated files** table (sortable by occurrence count and size impact)
3. **Drill-down view**: Click a file to see which mods contain it
4. **File preview**: View the actual content of duplicated files to verify identity
5. **Export capability**: CSV/XML export of duplication data for external analysis

## Goals

### Primary Goals
1. **Visibility**: Provide clear metrics on file duplication across all mods in a session
2. **Actionability**: Enable users to identify high-impact files worth extracting into libraries
3. **Verification**: Allow users to preview duplicated files to confirm they're truly identical
4. **Justification**: Generate data to support the case for introducing library mod types

### Secondary Goals
1. **Performance**: Hash computation must not significantly slow down mod processing (< 10% overhead)
2. **Memory efficiency**: Track duplication data without excessive memory consumption
3. **Incremental updates**: Support adding/removing mods from session dynamically

## Scope

### In Scope
- DuplicationTracker singleton with hashing and registry functionality
- Session-level duplication tracking (no persistence across page reloads)
- UI enhancements to Statistics tab (new duplication report section)
- File preview integration for duplicated files
- CSV/XML export of duplication data
- Storage savings calculations and metrics

### Out of Scope
- Persistent duplication database across sessions (no localStorage/IndexedDB)
- Automatic library extraction or mod restructuring
- Network-based deduplication across different users
- Similarity detection (only exact duplicates via hash comparison)
- File-level diff visualization (only show identical/different)

## Benefits

1. **Data-driven decisions**: Quantify the value of library extraction with concrete metrics
2. **Developer insight**: Help mod creators understand their code reuse patterns
3. **Library justification**: Build the business case for introducing library mod types
4. **Storage optimization**: Identify the biggest wins for reducing mod package sizes
5. **Quality assurance**: Detect unintentional file duplication or version drift

## Risks & Mitigation

### Risk: Hash computation overhead
- **Mitigation**: Use Web Crypto API (hardware-accelerated), process files asynchronously
- **Mitigation**: Only hash files once during initial processing, cache results

### Risk: Memory consumption for large sessions
- **Mitigation**: Store only hashes (32 bytes) and references, not file contents
- **Mitigation**: Provide clear session button to free memory

### Risk: False positives (different files with same hash)
- **Mitigation**: Use SHA-256 (cryptographically secure, collision-resistant)
- **Mitigation**: Include file preview to verify content

## Success Criteria

1. **Functional**: Duplication tracker correctly identifies all duplicated files across mods
2. **Performance**: Hash computation adds < 10% to overall processing time
3. **Usability**: Users can quickly identify top duplicated files and see where they appear
4. **Accuracy**: Hash-based deduplication has 100% precision (no false positives observed)
5. **Value**: Metrics show typical mod collections have 15-30% potential storage savings

## Related Work

This change builds upon:
- `refactor-statistics-tab-implementation`: Provides the utilities infrastructure (statistics-calculator.mjs, chart-renderer.mjs) that we'll extend
- Session statistics tracking: Already aggregates data across multiple mods

This change prepares for future work:
- Library mod type introduction (separate proposal)
- Dependency resolution for library mods
- Automatic extraction tooling
