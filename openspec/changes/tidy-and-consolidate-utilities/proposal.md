# Proposal: Tidy and Consolidate Utilities

## Overview
**Change ID**: `tidy-and-consolidate-utilities`  
**Status**: Draft  
**Priority**: High (technical debt reduction)  
**Risk Level**: Low (internal refactoring, no API changes)

## Problem Statement
The codebase (~5,800 lines of JavaScript) has accumulated technical debt through organic growth, resulting in:

1. **Duplicate utility functions**: `escapeHtml` is implemented in 5 different locations with identical functionality
2. **Duplicate utility functions**: `escapeXml` is implemented in 2 locations with identical functionality  
3. **Scattered DOM manipulation**: No centralized DOM helper functions, leading to repetitive `document.createElement`, `innerHTML` assignments
4. **Missing abstractions**: Common patterns like "create element with class and content" are repeated inline throughout tabs
5. **Inconsistent formatters**: Format helpers like `formatBytes` and `formatDuration` exist in parser.mjs but could be shared more explicitly
6. **No centralized utilities module**: Utility functions are spread across parser.mjs, base-tab.mjs, and individual tab files

This creates:
- **Maintenance burden**: Updates must be made in multiple places
- **Bug risk**: Inconsistent implementations may have subtle differences
- **Code bloat**: Hundreds of lines of duplicate code
- **Poor developer experience**: Difficult to discover existing utilities

## Proposed Solution
Create a centralized utilities system that consolidates duplicate functions and provides reusable helpers, focusing on **low-risk, high-impact** changes:

### Phase 1: Create Utility Modules (Lowest Risk)
1. **`src/web/js/utils/html-utils.mjs`** - HTML/DOM helpers
   - `escapeHtml()` - Single implementation replacing 5 duplicates
   - `escapeXml()` - Single implementation replacing 2 duplicates
   - `createElement(tag, className, content)` - Reduce boilerplate
   - `setElementContent(element, content)` - Safe innerHTML/textContent setter
   
2. **`src/web/js/utils/format-utils.mjs`** - Formatting utilities
   - Move `formatBytes()`, `formatDuration()` from parser.mjs
   - Add `formatTimestamp()`, `formatNumber()` for consistency

3. **`src/web/js/utils/dom-helpers.mjs`** - DOM manipulation helpers
   - `addClass()`, `removeClass()`, `toggleClass()` - Array/string support
   - `querySelector()`, `querySelectorAll()` - Null-safe wrappers
   - `empty()` - Clear element children efficiently

### Phase 2: Migrate Duplicate Functions (Low Risk)
1. Replace all 5 `escapeHtml` implementations with single import
2. Replace all 2 `escapeXml` implementations with single import
3. Update base-tab.mjs to use centralized utilities
4. Update all tab modules to import from utils/

### Phase 3: Add Missing Helpers (Medium Risk)
1. Create DOM builder functions to reduce inline HTML string concatenation
2. Add event listener helpers with cleanup tracking
3. Create validation helpers (extract common patterns)

## Benefits
### Immediate (Phase 1-2)
- **~200-300 lines removed** from duplicate function elimination
- **Single source of truth** for utility functions
- **Easier testing** - utilities can be unit tested in isolation
- **Better discoverability** - developers know where to find/add utilities

### Long-term (Phase 3)
- **Reduced inline HTML strings** - easier to maintain and less XSS risk
- **Cleaner tab implementations** - focus on business logic, not DOM manipulation
- **Foundation for future improvements** - centralized place to add optimizations

## Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| Import errors break functionality | High | Low | Thorough testing after each migration step |
| Performance regression from extra function calls | Low | Very Low | Modern JS engines optimize well; minimal overhead |
| Merge conflicts with active work | Medium | Low | Small, focused PRs; communicate with team |

## Success Criteria
1. ✅ Zero duplicate `escapeHtml` implementations
2. ✅ Zero duplicate `escapeXml` implementations  
3. ✅ All utility functions in `src/web/js/utils/` directory
4. ✅ No functionality changes - purely internal refactoring
5. ✅ Manual testing confirms all features work identically
6. ✅ Code review confirms improved readability

## Out of Scope
- Changing functionality or user-facing behavior
- Refactoring complex business logic (parser, validation, error management)
- Moving tab-specific code (intentionally left in tabs)
- Performance optimizations beyond consolidation

## Dependencies
None - this is internal refactoring only.

## Timeline Estimate
- Phase 1: 2-3 hours (create utility modules, write tests)
- Phase 2: 2-3 hours (migrate duplicate functions)
- Phase 3: 3-4 hours (add missing helpers, update call sites)

**Total: 7-10 hours** of focused development

## Stakeholders
- Developers (improved DX)
- Maintainers (reduced technical debt)

## References
- Current codebase analysis: ~5,800 lines across 15+ .mjs files
- Duplicate function locations documented in tasks.md
- Similar refactorings: validation.mjs consolidation (recent success)
