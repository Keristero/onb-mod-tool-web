# Refactor Tab Rendering Architecture

## Problem Statement

Performance degrades significantly when processing 100+ mods due to:
1. Tabs re-processing data on every mod selection
2. ErrorManager state being rebuilt unnecessarily
3. Lack of clear separation between "data loading" and "data rendering"
4. Deferred rendering still executes for all tabs even when not needed
5. No proper state caching strategy

## Current Architecture Issues

### Data Flow
```
selectMod(index)
  → onFileProcessed(mod) [ALL tabs]
    → Load zip archive
    → Parse errors
    → Run validation
  → render() [active tab]
  → requestIdleCallback render() [other tabs]
```

### Problems
- `onFileProcessed()` does both data loading AND state initialization
- ErrorManager rebuilt on every switch (even with caching fix)
- Validation runs multiple times unnecessarily
- No distinction between "first load" and "display cached data"
- requestIdleCallback still queues work for invisible tabs

## Proposed Architecture

### Separation of Concerns

```
┌─────────────────────────────────────────┐
│ Mod Data Layer (Immutable Once Loaded) │
│ - Parsed JSON                           │
│ - Zip Archive                           │
│ - Error List                            │
│ - Validation Results                    │
│ - Error Categories                      │
│ - Parsed Error Map (by file)           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Tab State Layer (Per-Tab State)        │
│ - Current Mod Reference                 │
│ - UI State (selections, filters, etc)  │
│ - Render Cache (optional)               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Rendering Layer (On-Demand Only)       │
│ - render() only when tab is visible    │
│ - Uses cached mod data                  │
│ - No data processing during render      │
└─────────────────────────────────────────┘
```

### Key Changes

#### 1. Pre-Process All Mod Data Once
```javascript
// During initial processing
modData = {
  fileName, fileSize, fileData,
  result, parsed, errors,
  
  // Pre-computed, cached data:
  zipArchive,          // Loaded once
  validationErrors,    // Computed once
  errorCategories,     // Computed once
  errorsByFile: Map,   // Pre-parsed error map
  status,              // Final status
  processingTime,
  timestamp
}
```

#### 2. Lightweight Tab Updates
```javascript
selectMod(index) {
  const mod = processedMods[index];
  
  // Just update references (no processing)
  for (const tab of tabs) {
    tab.setCurrentMod(mod);
  }
  
  // Render only active tab
  renderActiveTab();
}
```

#### 3. Tab Interface
```javascript
class BaseTab {
  setCurrentMod(mod) {
    this.currentMod = mod;
    this.needsRender = true;
  }
  
  render() {
    if (!this.needsRender) return;
    this._doRender();
    this.needsRender = false;
  }
}
```

#### 4. Lazy Rendering
- Only render when tab becomes visible
- Track `needsRender` flag per tab
- Clear flag after successful render

## Implementation Plan

### Phase 1: Data Layer Refactor
- [ ] Move error parsing to initial mod processing
- [ ] Cache `errorsByFile` Map on mod object
- [ ] Ensure all validation happens once during initial load
- [ ] Store all computed data on mod object

### Phase 2: Tab State Refactor
- [ ] Replace `onFileProcessed()` with `setCurrentMod()`
- [ ] Remove data processing from tabs
- [ ] Add `needsRender` flag tracking
- [ ] Implement lazy rendering

### Phase 3: Rendering Optimization
- [ ] Remove requestIdleCallback for inactive tabs
- [ ] Only render on tab switch if `needsRender === true`
- [ ] Add render debouncing where appropriate
- [ ] Profile and optimize hot paths

### Phase 4: Cleanup
- [ ] Remove duplicate state management
- [ ] Simplify tab initialization
- [ ] Update documentation
- [ ] Add performance metrics

## Expected Performance Improvements

- **Mod Selection**: ~10x faster (no re-processing)
- **Tab Switching**: Instant (just render, no data loading)
- **Memory**: Slightly higher (cached data), but predictable
- **100+ Mods**: No degradation (each mod processed once)

## Breaking Changes

- `onFileProcessed()` becomes `setCurrentMod()` (simple refactor)
- ErrorManager no longer needs `parseErrors()` on every switch
- Tabs must use cached data from mod object

## Migration Strategy

1. Update mod processing to cache all data
2. Update tabs one at a time to use cached data
3. Test thoroughly with 300+ mods
4. Remove old code paths
5. Update tests

## Success Metrics

- Select mod at position 200: < 50ms
- Switch tabs with 300 mods loaded: < 100ms
- Memory usage scales linearly with mod count
- No requestIdleCallback queuing for invisible tabs
