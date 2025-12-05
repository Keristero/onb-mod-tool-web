# Implementation Tasks: Tidy and Consolidate Utilities

## Phase 1: Create Utility Modules (Foundation)

### Task 1.1: Create html-utils.mjs
- [x] Create `src/web/js/utils/html-utils.mjs`
- [x] Implement `escapeHtml(text)` function (consolidate from 5 locations)
- [x] Implement `escapeXml(text)` function (consolidate from 2 locations)
- [x] Implement `createElement(tag, options)` - {className, textContent, innerHTML, dataset}
- [x] Implement `setElementContent(element, content, safe = true)` - auto-choose textContent vs innerHTML
- [x] Add JSDoc comments for all functions
- [x] Export all functions

**Locations to consolidate from:**
- `escapeHtml`: parser.mjs:283, base-tab.mjs:128, results-tab.mjs:613, statistics-tab.mjs:157, chart-renderer.mjs:208
- `escapeXml`: base-tab.mjs:138, data-exporter.mjs:8

### Task 1.2: Create format-utils.mjs
- [x] Create `src/web/js/utils/format-utils.mjs`
- [x] Move `formatBytes(bytes)` from parser.mjs
- [x] Move `formatDuration(ms)` from parser.mjs
- [x] Add `formatTimestamp(date, format = 'short')` for consistent date formatting
- [x] Add `formatNumber(num, decimals = 2)` for consistent number formatting
- [x] Add JSDoc comments for all functions
- [x] Export all functions

### Task 1.3: Create dom-helpers.mjs
- [x] Create `src/web/js/utils/dom-helpers.mjs`
- [x] Implement `addClass(element, ...classes)` - supports arrays and strings
- [x] Implement `removeClass(element, ...classes)` - supports arrays and strings
- [x] Implement `toggleClass(element, className, force)` - safe wrapper
- [x] Implement `querySelector(selector, context = document)` - null-safe
- [x] Implement `querySelectorAll(selector, context = document)` - returns array
- [x] Implement `empty(element)` - efficient clear children
- [x] Implement `hide(element)` and `show(element, display = '')` - visibility helpers
- [x] Add JSDoc comments for all functions
- [x] Export all functions

## Phase 2: Migrate Duplicate Functions (Low Risk)

### Task 2.1: Update parser.mjs
- [x] Import `escapeHtml` from `utils/html-utils.mjs`
- [x] Remove local `escapeHtml` function (line 283)
- [x] Update all internal references to use imported version
- [x] Remove `formatBytes` and `formatDuration` exports (moved to format-utils)
- [x] Add imports from `utils/format-utils.mjs`
- [x] Re-export formatBytes and formatDuration for backward compatibility (temporary)
- [x] Verify parser.mjs still works correctly

### Task 2.2: Update base-tab.mjs
- [x] Import `escapeHtml` and `escapeXml` from `utils/html-utils.mjs`
- [x] Remove local `escapeHtml` method (line 128)
- [x] Remove local `escapeXml` method (line 138)
- [x] Import `formatBytes` from `utils/format-utils.mjs`
- [x] Remove local `formatBytes` method
- [x] Update all internal references
- [x] Verify base-tab.mjs works correctly

### Task 2.3: Update results-tab.mjs
- [x] Import `escapeHtml` from `utils/html-utils.mjs`
- [x] Remove local `escapeHtml` function (line 613)
- [x] Update all internal references
- [x] Verify results tab renders correctly

### Task 2.4: Update statistics-tab.mjs
- [x] Import `escapeHtml` from `utils/html-utils.mjs`
- [x] Remove local `escapeHtml` method (line 157)
- [x] Update all internal references
- [x] Verify statistics tab renders correctly

### Task 2.5: Update chart-renderer.mjs
- [x] Import `escapeHtml` from `utils/html-utils.mjs`
- [x] Remove local `escapeHtml` function (line 208)
- [x] Update all internal references
- [x] Verify charts render correctly with tooltips

### Task 2.6: Update data-exporter.mjs
- [x] Import `escapeXml` from `utils/html-utils.mjs`
- [x] Remove local `escapeXml` function (line 8)
- [x] Update all internal references
- [x] Verify XML export works correctly

### Task 2.7: Update file-preview-mixin.mjs
- [x] Import `escapeHtml` directly from `utils/html-utils.mjs`
- [x] Update all `this.escapeHtml` references to use imported function
- [x] Verify it continues to work after base-tab changes

## Phase 3: Add Missing Helpers & Optimize Call Sites

### Task 3.1: Add DOM builder helpers to dom-helpers.mjs
- [x] Implement `createButton(text, options)` - common button pattern
- [x] Implement `createDiv(className, content)` - common div pattern
- [x] Implement `appendChildren(parent, ...children)` - bulk append
- [x] Document usage examples in comments

### Task 3.2: Optimize main.mjs DOM creation
- [x] Replace `document.createElement` + manual property setting with `createElement()`
- [x] Replace inline `.innerHTML` concatenation with builder functions (where safe)
- [x] Target: Reduced lines through consolidation

### Task 3.3: Optimize tab modules
- [x] Update base-tab.mjs to use createElement helper
- [x] Update file-preview-mixin.mjs to use createElement helper
- [x] Update chart-renderer.mjs to use createElement helper
- [x] Update dependencies-tab.mjs to use createElement helper
- [x] Target: Reduced lines per tab through consolidation

### Task 3.4: Create validation-helpers.mjs (optional)
- [ ] Extract common validation patterns from validation.mjs
- [ ] Implement `isEmpty(value)`, `isInvalid(value, invalidList)` helpers
- [ ] Implement `countBySeverity(issues)` helper
- [ ] Skipped - no clear patterns emerged during review

## Phase 4: Documentation & Cleanup

### Task 4.1: Update documentation
- [x] Add `src/web/js/utils/README.md` documenting all utility modules
- [x] Update inline comments explaining utility usage patterns
- [x] Add examples for common use cases

### Task 4.2: Final cleanup
- [x] Remove unnecessary safe wrapper functions (querySelector/querySelectorAll)
- [x] Search for any remaining duplicate utility patterns
- [x] Optimized DOM creation throughout codebase
- [ ] Run manual test suite to verify all functionality
- [ ] Check browser console for any errors

### Task 4.3: Verification
- [ ] Test file upload and processing
- [ ] Test all tabs (results, files, statistics, dependencies)
- [ ] Test error display and file previews
- [ ] Test exports (CSV, XML, JSON, PNG)
- [ ] Test version switching
- [ ] Test with multiple mods
- [ ] Verify no console errors or warnings

## Dependencies
Tasks should be completed sequentially within each phase. Phases can partially overlap (e.g., Phase 3 can start while Phase 2 is ongoing for different files).

## Validation Checkpoints
- After Task 1.3: Verify all utility modules exist and export correctly
- After Task 2.7: Verify zero duplicate functions remain
- After Task 3.3: Verify all tabs work correctly with new utilities
- After Task 4.3: Full regression test passes

## Rollback Plan
If issues arise:
1. Git revert to previous commit (atomic commits per phase)
2. All changes are additive imports - safe to revert incrementally
3. No data migration or schema changes - pure code refactoring
