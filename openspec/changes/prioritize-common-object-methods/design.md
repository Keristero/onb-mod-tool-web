# Design Document: Common Object Methods Classification

## Problem Statement
The current implementation assigns syntax highlighting colors to object methods based on their first occurrence in the `objectMethods` iteration order, causing shared methods to be colored inconsistently. Methods like `set_name` that work across Block, Card, Mob, and Player types should be visually distinguished as "common" rather than type-specific.

## Current Architecture

### Metadata Structure
```json
{
  "lua": {
    "objectMethods": {
      "Block": ["set_name", "set_color", ...],
      "Card": ["set_icon_texture", ...],
      "Common": ["declare_package_id", ...],
      "Mob": ["set_name", "set_health", ...],
      "Player": ["set_name", "set_attack", ...]
    }
  }
}
```

### Extraction Process (extract_globals.js)
1. Parse Dart files for `useXxxPackage()` and `useXxxEntity()` functions
2. Extract method names from returned map structures
3. Assign to object type based on function name (e.g., `useCardPackage` → "Card")
4. Output as-is without deduplication

### Highlighting Process (base-tab.mjs)
1. Iterate `Object.entries(metadata.lua.objectMethods)`
2. For each type, apply regex replacements for methods
3. Later iterations can overwrite earlier ones
4. JavaScript object iteration order: insertion order (typically alphabetical for JSON parsing)

**Result**: "Block" processes first, so `set_name` gets `hljs-onb-method-block` class, and later types don't override it due to regex matching specifics.

## Design Decision: Two-Pass Approach

### Alternative 1: Single-Pass with Priority Map (Rejected)
Build a method→type mapping during iteration, checking if method already seen.

**Pros**: Minimal changes to existing code structure  
**Cons**: 
- Doesn't solve metadata redundancy
- Still requires type priority logic in JavaScript
- Tooltip ambiguity (which type to show?)

### Alternative 2: Metadata Preprocessing (Rejected)
Transform metadata at load time to deduplicate in JavaScript.

**Pros**: No changes to extraction script  
**Cons**:
- Loses source-of-truth in metadata
- Complicates runtime logic
- Doesn't benefit non-web consumers of metadata

### Alternative 3: Extraction-Time Deduplication (Selected)
Detect and classify common methods during extraction, store in metadata.

**Pros**:
- Single source of truth
- Simpler runtime logic
- Benefits all metadata consumers
- Clear semantic meaning in data structure

**Cons**:
- Requires extraction script changes
- Regeneration needed for all versions

## Implementation Approach

### Phase 1: Extraction Enhancement

#### Detection Algorithm
```javascript
// After collecting all object methods:
const methodCounts = new Map(); // method → Set<objectType>

for (const [type, methods] of collector.objectMethods) {
  for (const method of methods) {
    if (!methodCounts.has(method)) {
      methodCounts.set(method, new Set());
    }
    methodCounts.get(method).add(type);
  }
}

// Find common methods (appear in 2+ types)
const commonMethods = Array.from(methodCounts.entries())
  .filter(([method, types]) => types.size >= 2)
  .map(([method, types]) => method);

// Remove from type-specific arrays
for (const [type, methods] of collector.objectMethods) {
  const filtered = methods.filter(m => !commonMethods.includes(m));
  collector.objectMethods.set(type, filtered);
}

// Add to Common (merge with existing)
const existingCommon = collector.objectMethods.get('Common') || new Set();
commonMethods.forEach(m => existingCommon.add(m));
collector.objectMethods.set('Common', existingCommon);
```

#### Configuration
Add optional threshold parameter:
```javascript
const config = {
  // ...
  commonMethodThreshold: 2 // Methods appearing in N+ types are common
};
```

#### Edge Cases
- Method only in "Common" explicitly: Keep as-is
- Method in 1 type + Common: Move to type-specific only if threshold=2
- Method in all types: Definitely common

### Phase 2: Highlighting Priority

#### Current Regex Pattern
```javascript
Object.entries(metadata.lua.objectMethods).forEach(([typeName, methods]) => {
  methods.forEach(method => {
    const regex = new RegExp(`(?<!<[^>]*?):([\\s]*)(${escapeRegex(method)})\\b(?![^<]*?>)`, 'g');
    highlighted = highlighted.replace(regex, `:$1<span class="hljs-onb-method-${typeName.toLowerCase()}" ...>$2</span>`);
  });
});
```

**Problem**: First match wins due to HTML markup blocking subsequent matches.

#### Solution: Process Common Last
```javascript
// Separate Common from type-specific
const typeSpecific = Object.entries(metadata.lua.objectMethods)
  .filter(([type, _]) => type !== 'Common');
const common = metadata.lua.objectMethods.Common || [];

// Process type-specific first
typeSpecific.forEach(([typeName, methods]) => {
  // ... existing logic
});

// Process Common last (will replace type-specific spans with Common spans)
common.forEach(method => {
  // More aggressive replacement: match existing spans too
  const regex = new RegExp(
    `(?::<span[^>]*?>\\s*</span>|:)([\\s]*)(?:<span[^>]*?>)?(${escapeRegex(method)})(?:</span>)?\\b`,
    'g'
  );
  highlighted = highlighted.replace(regex, 
    `:$1<span class="hljs-onb-method-common" data-onb-type="method" data-onb-name="${escapeAttribute(method)}" data-onb-extra="Common">$2</span>`
  );
});
```

**Alternative**: Remove previous spans then reapply
```javascript
// Simpler: strip existing method spans, then apply Common
common.forEach(method => {
  // Remove any existing span for this method after colon
  highlighted = highlighted.replace(
    new RegExp(`(:</span>|:)([\\s]*)<span class="hljs-onb-method-[^"]*?"[^>]*?>${escapeRegex(method)}</span>`, 'g'),
    `$1$2${method}`
  );
  
  // Now apply Common class
  highlighted = highlighted.replace(
    new RegExp(`(:</span>|:)([\\s]*)(${escapeRegex(method)})\\b(?![^<]*?>)`, 'g'),
    `$1$2<span class="hljs-onb-method-common" data-onb-type="method" data-onb-name="${escapeAttribute(method)}" data-onb-extra="Common">$3</span>`
  );
});
```

#### Tooltip Enhancement
Update `showOnbTooltip()`:
```javascript
else if (type === 'method') {
  const objectType = element.getAttribute('data-onb-extra');
  
  if (objectType === 'Common') {
    // Find all types that originally had this method
    const sharedBy = [];
    Object.entries(metadata.lua.objectMethods).forEach(([type, methods]) => {
      if (type !== 'Common' && methods.includes(name)) {
        sharedBy.push(type);
      }
    });
    
    // Fallback: check method counts in extraction metadata
    // (Could add this info to metadata.json for accuracy)
    text = `Common method: ${name}\nShared by: ${sharedBy.join(', ')}`;
  } else {
    // Existing type-specific logic
  }
}
```

**Limitation**: After deduplication, type-specific arrays won't contain common methods, so we can't reconstruct the sharing info. Need to preserve it.

#### Metadata Enhancement (Optional)
Add sharing metadata:
```json
{
  "lua": {
    "objectMethods": {
      "Common": ["set_name", ...]
    },
    "methodSharing": {
      "set_name": ["Block", "Card", "Mob", "Player"],
      "set_description": ["Block", "Common", "Mob"]
    }
  }
}
```

This allows tooltips to show exact sharing information.

## Testing Strategy

### Unit Tests (Extraction)
- Single method in one type → stays in that type
- Method in two types → moves to Common, removed from both
- Method already in Common → stays in Common
- Method in Common + one type → behavior based on threshold

### Integration Tests (Highlighting)
- Common method highlighted green
- Type-specific method keeps original color
- Common method after type-specific in code → still green
- Tooltip shows correct sharing information

### Visual Regression
- Compare before/after screenshots of sample mods
- Verify color consistency across file browser and results tabs

## Performance Considerations

### Extraction
- Additional O(M × T) pass where M=methods, T=types
- Typical: ~50 methods × 5 types = 250 comparisons (negligible)

### Runtime
- Two iteration passes instead of one
- String replacement overhead minimal (same number of replacements)
- No impact on load time or rendering performance

## Backward Compatibility

### Metadata Format
- No breaking changes (additive only)
- Old code ignores "Common" type: graceful degradation
- New code handles missing "Common": treats as empty array

### CSS Classes
- `hljs-onb-method-common` already defined and styled
- No changes needed to stylesheets

## Future Enhancements

1. **Signature Analysis**: Detect methods with same name but different signatures
2. **Inheritance Tracking**: Track which types inherit from common base classes
3. **Documentation Links**: Add method documentation URLs to tooltips
4. **Custom Grouping**: Allow manual override of automatic classification

## Implementation Order

1. **Extract deduplication logic** (isolated, testable)
2. **Update highlighting order** (requires updated metadata)
3. **Regenerate metadata files** (uses step 1)
4. **Add tooltip enhancement** (optional, can be done later)

This order minimizes risk and allows incremental validation at each step.
