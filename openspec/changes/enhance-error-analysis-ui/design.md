# Design: Enhanced Error Analysis UI

## Context
The current results tab displays console output at the bottom, requiring users to scroll past JSON trees to see errors. Error messages contain valuable metadata (file paths, line:column numbers) but are plain text, forcing manual navigation to the file browser tab. This proposal enhances the UX by making errors interactive and bringing the most critical information (console output) to the top.

## Goals / Non-Goals

**Goals:**
- Make errors immediately visible and actionable
- Provide contextual file previews without leaving results tab
- Reuse existing file preview logic to avoid duplication
- Support precise error location highlighting (line + column)
- Enable quick navigation to file browser for deeper inspection

**Non-Goals:**
- Auto-fix suggestions or error correction (future feature)
- Multi-file diff views
- Real-time error updates (batch processing only)
- Error filtering by severity (current ERR:/WARN: distinction sufficient)

## Decisions

### 1. Console-First Layout
**Decision**: Move console output section to the top of results tab, before mod summary and JSON tree.

**Rationale**:
- Errors are the most actionable information - developers need to see them first
- Follows mental model: "What went wrong?" before "What did I get?"
- Matches terminal/IDE conventions where errors appear immediately

**Alternatives considered**:
- Sticky error banner: Too disruptive, hides JSON content
- Separate errors tab: Adds navigation overhead
- Keep at bottom with scroll-to-errors button: Doesn't solve visibility problem

### 2. Shared Preview Component
**Decision**: Extract file preview logic from `file-browser-tab.mjs` into `preview-manager.mjs` module that both tabs can use.

**Pattern**:
```javascript
// preview-manager.mjs
export class FilePreviewManager {
  async renderPreview(file, options = {}) {
    // Handle images, text, binary
    // Support highlight options: { line, column, lines: [1, 5, 10] }
  }
}
```

**Rationale**:
- DRY principle: Don't duplicate syntax highlighting, image rendering, etc.
- Consistent preview behavior across tabs
- Easier to add new file types or preview features once

**Alternatives considered**:
- Duplicate preview logic in results-tab: Violates DRY, hard to maintain
- Import file-browser-tab into results-tab: Circular dependency, wrong abstraction
- Use web components: Over-engineered for simple use case

### 3. Hover-Triggered Preview Popup
**Decision**: Show preview in a floating tooltip/popup positioned near the hovered element, not in a fixed sidebar.

**UI Behavior**:
- Hover filename → popup appears with ~10 lines of context
- Hover line:column → popup shows exact line with column marker
- 300ms delay to prevent accidental triggers
- Click popup → opens file browser tab with file selected
- Press ESC or move mouse away → dismisses popup

**Rationale**:
- Non-modal: Doesn't interrupt workflow
- Context-aware: Shows preview near cursor
- Progressive disclosure: More detail on click

**Alternatives considered**:
- Inline expansion: Would push console text around, jarring
- Fixed sidebar: Takes up screen real estate when not needed
- Modal overlay: Too heavy for quick previews

### 4. Error Location Parsing
**Decision**: Extend existing `parser.parseErrorLocation()` to handle bracketed format `[line:column]` in addition to `file:line:column`.

**Patterns to support**:
```
file.lua:24:39         → {file: "file.lua", line: 24, column: 39}
file.lua:24            → {file: "file.lua", line: 24, column: null}
file.lua line 24       → {file: "file.lua", line: 24, column: null}
[24:39]                → {line: 24, column: 39}  (no file)
[ 24:39 ]              → {line: 24, column: 39}  (with spaces)
```

**Rationale**:
- Many Lua interpreters use `[line:col]` format
- Whitespace-tolerant parsing is more robust
- Fallback to null column is graceful degradation

### 5. Column Highlighting Animation
**Decision**: Use a CSS animation to draw attention to the exact error character position:
- Pulsing background color (2-second duration, 3 cycles)
- Smooth fade between highlight and normal state
- Only triggers on hover, stops when unhovered

**CSS approach**:
```css
@keyframes pulse-error-char {
  0%, 100% { background-color: rgba(244, 67, 54, 0.3); }
  50% { background-color: rgba(244, 67, 54, 0.7); }
}
.error-char-highlight {
  animation: pulse-error-char 0.7s ease-in-out 3;
}
```

**Rationale**:
- Animation draws eye to precise location
- 3 pulses is noticeable but not annoying
- GPU-accelerated CSS animation is performant

**Alternatives considered**:
- Static highlight: Less noticeable
- Blinking cursor: Too distracting
- Underline/border: Less visible on small characters

### 6. Multi-Error Highlighting
**Decision**: When hovering a filename that appears in multiple errors, highlight all affected lines in the preview with different intensity:
- Hovered error: Full opacity (100%)
- Other errors in same file: Reduced opacity (50%)

**Rationale**:
- Shows error density in file
- Distinguishes primary error from context
- Helps prioritize fixes (many errors in one file vs scattered)

**Implementation**:
- Track all errors by filename in results-tab state
- Pass `highlightLines: [1, 5, 10]` to preview manager
- Preview manager applies different CSS classes

## Architecture

### Component Interaction Flow
```
Console Output (results-tab.mjs)
    ↓ user hovers filename/location
    ↓
Error Parser (parser.mjs)
    ↓ extract file, line, column
    ↓
Preview Manager (preview-manager.mjs)
    ↓ fetch file from zipArchive
    ↓ render with highlighting
    ↓
Popup Component (preview-popup.mjs)
    ↓ position near cursor
    ↓ show preview
    ↓ user clicks
    ↓
File Browser Tab
    ↓ select file
    ↓ scroll to line
```

### Module Responsibilities

**preview-manager.mjs** (new):
- File content rendering (text, image, binary)
- Syntax highlighting integration
- Line/column highlighting
- Shared by results-tab and file-browser-tab

**preview-popup.mjs** (new):
- Popup positioning logic
- Show/hide animations
- Click-to-navigate handling
- Escape key listener

**results-tab.mjs** (modified):
- Layout reordering (console first)
- Parse console output for clickable elements
- Track errors by filename
- Coordinate popup display

**parser.mjs** (modified):
- Enhanced error location parsing
- Support bracketed format `[line:col]`

## Risks / Trade-offs

### Risk: Hover Popups Feel Sluggish
**Mitigation**: Use 300ms delay (standard for tooltips), lazy-load file content only on hover, cache previews for repeated hovers.

### Risk: Large Files Slow Down Preview
**Mitigation**: Preview manager shows max 20 lines (10 before + 10 after target line), truncate long lines (>200 chars), skip syntax highlighting for files >1000 lines.

### Risk: Error Parsing False Positives
**Mitigation**: Only make text interactive if it matches a known file in the zip archive. Non-existent files remain plain text.

### Trade-off: Shared Component Complexity
**Benefit**: Single source of truth, consistent behavior
**Cost**: More indirection, need to handle two contexts (inline vs popup)
**Decision**: Worth it - preview logic is complex enough to warrant extraction

## Migration Plan

### Phase 1: Extract Preview Component
1. Create `preview-manager.mjs` with file rendering logic
2. Refactor `file-browser-tab.mjs` to use preview manager
3. Verify file browser still works (no functionality changes)

### Phase 2: Interactive Console Output
1. Move console section to top in `results-tab.mjs` layout
2. Parse console output for filenames and locations
3. Add hover event listeners

### Phase 3: Popup Previews
1. Implement `preview-popup.mjs` with positioning and animations
2. Wire up hover → preview flow
3. Add multi-error highlighting

### Phase 4: Click Navigation
1. Implement click → file browser navigation
2. Add scroll-to-line behavior
3. Polish animations and transitions

### Rollback Plan
No data migration needed. Changes are purely UI. If issues arise, revert commits in reverse order (Phase 4 → 3 → 2 → 1).

## Open Questions
1. **Should popup show full file or just context?** → Start with 20-line context, add "show full file" button if needed
2. **Should we highlight errors in JSON tree view?** → No, out of scope (JSON errors are rare)
3. **Should error counts be per-file in summary?** → No, current aggregate count is sufficient
