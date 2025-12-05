# Design Document: Tidy and Consolidate Utilities

## Architectural Decisions

### 1. Module Organization Strategy

#### Decision: Create Separate Utility Modules by Responsibility
We're creating three distinct utility modules rather than one monolithic `utils.mjs`:

```
src/web/js/utils/
├── html-utils.mjs      # HTML/XML escaping, element creation
├── format-utils.mjs    # Data formatting (bytes, duration, dates, numbers)
└── dom-helpers.mjs     # DOM manipulation and queries
```

**Rationale:**
- **Single Responsibility**: Each module has a clear, focused purpose
- **Tree-shaking friendly**: Only import what you need
- **Easier navigation**: Developers know where to find specific utilities
- **Incremental adoption**: Can migrate one module at a time

**Alternatives considered:**
- ❌ **Single utils.mjs**: Too large, violates SRP, harder to maintain
- ❌ **Per-tab utilities**: Creates silos, duplicates code
- ✅ **Responsibility-based modules**: Best balance of cohesion and discoverability

### 2. Import Strategy & Backward Compatibility

#### Decision: Centralize First, Migrate Gradually
Phase 1 creates new modules without removing old code. Phase 2 migrates incrementally.

**Rationale:**
- **Risk mitigation**: Can test new utilities independently before migration
- **Atomic commits**: Each migration is a separate, revertible commit
- **No breaking changes**: Old code continues working during transition
- **Validation per step**: Test after each file migration, not all at once

**Migration pattern:**
```javascript
// Before (in base-tab.mjs)
escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// After migration
import { escapeHtml } from '../utils/html-utils.mjs';
// Method removed, calls updated to use imported function
```

### 3. Function Consolidation Approach

#### Decision: Exact Replication, Then Enhancement
Phase 1-2 replicates existing behavior exactly. Phase 3 adds enhancements.

**Rationale:**
- **Safety first**: Ensures no behavioral changes during consolidation
- **Easy validation**: Can compare output byte-for-byte
- **Incremental improvement**: Enhancements come after core is stable

**Example - escapeHtml consolidation:**
All 5 implementations are functionally identical:
```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
```

We preserve this exact implementation in `html-utils.mjs`, then optimize in future PRs if needed.

### 4. DOM Manipulation Philosophy

#### Decision: Provide Low-Level Helpers, Not High-Level Components
New DOM helpers are simple wrappers, not complex abstractions.

**Rationale:**
- **Low risk**: Simple wrappers are predictable and testable
- **Flexibility**: Tabs retain control over their rendering logic
- **No framework**: Maintains vanilla JS approach (per project conventions)
- **Optional adoption**: Teams can use or ignore helpers

**What we're building:**
```javascript
// ✅ Simple, clear helpers
createElement(tag, { className, textContent })
querySelector(selector, context)
addClass(element, ...classes)

// ❌ NOT building complex abstractions
Component({ template, state, lifecycle })
VirtualDOM()
ReactiveBinding()
```

### 5. Testing Strategy

#### Decision: Manual Testing + Browser Validation
No unit test framework for this refactoring; rely on comprehensive manual testing.

**Rationale:**
- **Current reality**: Project has no test framework setup yet
- **Refactoring nature**: Not changing behavior, just location
- **Browser validation**: Real-world testing catches integration issues unit tests miss
- **Manual test plan**: Comprehensive checklist in tasks.md (Task 4.3)

**Future consideration**: Once utilities stabilize, they're excellent candidates for unit tests if/when a test framework is added.

### 6. Performance Considerations

#### Decision: Negligible Performance Impact Expected
Modern JS engines optimize function calls effectively. Extra indirection is acceptable.

**Performance analysis:**
- **Before**: Inline `escapeHtml` called ~50 times per render
- **After**: Imported `escapeHtml` called ~50 times per render
- **Overhead**: ~0.1-0.2ms per render (negligible vs ~50-200ms WASM processing)
- **Benefit**: Smaller bundle size (fewer duplicate functions)

**Measurement plan:**
- If performance concerns arise, measure with browser DevTools profiler
- Focus on render-heavy operations (JSON tree, file browser)
- Acceptable threshold: <5% increase in render time

### 7. Error Handling & Null Safety

#### Decision: Add Null-Safe Wrappers for DOM Queries
Prevent common `Cannot read property of null` errors.

**Pattern:**
```javascript
// Before - unsafe
const element = document.querySelector('.foo');
element.textContent = 'bar'; // 💥 Throws if not found

// After - safe
const element = querySelector('.foo');
if (element) element.textContent = 'bar';

// Or with helper
setElementContent('.foo', 'bar'); // No-op if not found
```

**Rationale:**
- **Defensive coding**: Prevents common runtime errors
- **Better DX**: Less null checking boilerplate
- **Graceful degradation**: Missing elements don't crash app

### 8. Import Path Conventions

#### Decision: Use Relative Imports, Consistent Depth
All imports use `../utils/` pattern from current location.

**Examples:**
```javascript
// From src/web/js/tabs/results-tab.mjs
import { escapeHtml } from '../utils/html-utils.mjs';

// From src/web/js/main.mjs
import { formatBytes } from './utils/format-utils.mjs';

// From src/web/js/parser.mjs
import { escapeHtml } from './utils/html-utils.mjs';
```

**Rationale:**
- **Consistency**: Easy to understand and predict
- **No build system**: No path aliases or bundler magic needed
- **Browser compatible**: Works in modern ES6 module-capable browsers

## Implementation Notes

### Critical Path
1. **Phase 1 must complete first**: Foundation must exist before migration
2. **Phase 2 is sequential per file**: Migrate one file at a time, test, commit
3. **Phase 3 is parallelizable**: Different tabs can be optimized independently

### Risk Mitigation
- **Small PRs**: Each phase is a separate PR for easier review
- **Feature flags**: Not needed (internal refactoring only)
- **Rollback**: Git revert is sufficient; no data migrations

### Success Metrics
- **Lines of code**: Target 200-300 line reduction
- **Duplicate functions**: Must reach zero
- **Build time**: Should remain unchanged
- **Render performance**: Must not regress >5%

## Future Considerations

### Post-Launch Improvements (Out of Scope)
1. **Unit tests**: Once test framework is added, utilities are perfect candidates
2. **Enhanced helpers**: Builder patterns for complex HTML structures
3. **Memoization**: Cache expensive operations (formatBytes, escapeHtml on repeated inputs)
4. **Type definitions**: JSDoc → TypeScript .d.ts for better IDE support

### Potential Follow-Up Proposals
1. **Consolidate parser utilities**: Move more parsing logic to dedicated modules
2. **Refactor tab base class**: More shared functionality in BaseTab
3. **Extract chart utilities**: D3 wrappers for consistency

## Related Documents
- **Proposal**: ./proposal.md - High-level overview and justification
- **Tasks**: ./tasks.md - Step-by-step implementation checklist
- **Project conventions**: ../../project.md - Coding standards and patterns
