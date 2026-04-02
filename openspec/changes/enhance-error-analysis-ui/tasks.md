# Implementation Tasks: Enhanced Error Analysis UI

## 1. Foundation - Shared Preview Component

- [ ] 1.1 Create `src/web/js/preview-manager.mjs` module
  - Export `FilePreviewManager` class
  - Implement `renderPreview(file, options)` method
  - Support options: `{ line, column, lines: [], maxLines: 20 }`

- [ ] 1.2 Extract text preview logic from file-browser-tab
  - Move syntax highlighting integration
  - Move line numbering generation
  - Move error line highlighting logic

- [ ] 1.3 Extract image/binary preview logic
  - Move image rendering with size constraints
  - Move binary file info display

- [ ] 1.4 Refactor file-browser-tab to use preview manager
  - Replace `displayText()` with preview manager calls
  - Replace `displayImage()` with preview manager calls
  - Verify file browser functionality unchanged (manual test)

## 2. Error Parsing Enhancement

- [ ] 2.1 Extend `parser.parseErrorLocation()` to support bracketed format
  - Add regex pattern for `[line:col]` with optional whitespace
  - Add tests for: `[24:39]`, `[ 24:39 ]`, `[24]`

- [ ] 2.2 Add filename inference for bracketed locations
  - Parse preceding context: "ERR: entry.lua [24:39]" → file: "entry.lua"
  - Handle multiple whitespace variations

- [ ] 2.3 Create `extractInteractiveElements()` utility
  - Parse console output line-by-line
  - Return array of `{ text, type: 'filename'|'location', file, line, column, offset }`
  - Validate filenames exist in zip archive

## 3. Results Tab Layout Reordering

- [ ] 3.1 Move console section HTML before summary in results-tab
  - Update `init()` method to reorder DOM structure
  - Ensure proper CSS classes maintained

- [ ] 3.2 Update `renderConsoleOutput()` to parse for interactive elements
  - Call `extractInteractiveElements()` on stdout/stderr
  - Wrap interactive text in `<span>` with data attributes
  - Add CSS classes: `interactive-filename`, `interactive-location`

- [ ] 3.3 Style interactive elements
  - Add hover underline and cursor pointer
  - Add subtle color change on hover
  - Ensure accessibility (focus outline, ARIA labels)

## 4. Preview Popup Component

- [ ] 4.1 Create `src/web/js/preview-popup.mjs` module
  - Export `PreviewPopup` class
  - Implement `show(content, position)` method
  - Implement `hide()` method with fade animation

- [ ] 4.2 Implement smart positioning logic
  - Calculate popup dimensions
  - Check viewport boundaries
  - Reposition if near edge (left/right, top/bottom)
  - Add 10px offset from cursor

- [ ] 4.3 Add interaction handlers
  - Mouse leave → hide after 200ms
  - Escape key → immediate hide
  - Click → emit navigate event

- [ ] 4.4 Add CSS styles for popup
  - Floating container with shadow
  - Max width 600px, max height 400px
  - Fade in/out transitions
  - Scrollable content area

## 5. Hover Preview Integration

- [ ] 5.1 Add hover event listeners to interactive elements in results-tab
  - Attach to `.interactive-filename` and `.interactive-location`
  - Implement 300ms hover delay timer
  - Cancel timer on mouse leave

- [ ] 5.2 Implement filename hover handler
  - Extract filename from data attribute
  - Find all errors for that file
  - Call preview manager with `{ lines: [10, 24, 45] }`
  - Show popup via PreviewPopup.show()

- [ ] 5.3 Implement location hover handler
  - Extract line/column from data attribute
  - Call preview manager with `{ line, column }`
  - Show popup with animated column highlight
  - Center error line in preview

- [ ] 5.4 Add preview caching
  - Cache rendered previews by file path
  - Clear cache on new mod analysis
  - Serve from cache on repeated hovers

## 6. Column Highlighting Animation

- [ ] 6.1 Add CSS animation for column highlight
  - Define `@keyframes pulse-error-char`
  - 0.7s duration, 3 iterations
  - Pulse between 30% and 70% opacity red background

- [ ] 6.2 Implement column character wrapping in preview manager
  - When `options.column` provided, wrap target character in `<span class="error-char-highlight">`
  - Handle multi-byte characters correctly
  - Handle column at end of line gracefully

- [ ] 6.3 Add animation start/stop logic
  - Animation starts on popup show
  - Animation stops on popup hide
  - Only one animation active at a time

## 7. Multi-Error Line Highlighting

- [ ] 7.1 Track errors by filename in results-tab state
  - Parse all errors on render
  - Build map: `{ "entry.lua": [10, 24, 45] }`

- [ ] 7.2 Implement opacity-based multi-line highlighting
  - Primary error (hovered): 100% opacity
  - Secondary errors: 50% opacity
  - Add CSS classes: `.error-line-primary`, `.error-line-secondary`

- [ ] 7.3 Add "additional errors" note for distant lines
  - If error lines span > 50 lines, show note in preview
  - Note format: "Additional errors on lines: 100, 200"

## 8. File Browser Navigation

- [ ] 8.1 Add click handler to preview popup
  - Emit custom event `preview:navigate` with `{ file, line, column }`
  - Prevent event bubbling

- [ ] 8.2 Implement navigation handler in main.mjs
  - Listen for `preview:navigate` event
  - Switch to file browser tab
  - Call file browser's `selectFile(path)` method

- [ ] 8.3 Enhance file browser `selectFile()` to support scroll-to-line
  - Add optional `{ scrollToLine, highlightColumn }` parameter
  - Scroll to line after rendering
  - Apply column animation if provided

## 9. Performance Optimization

- [ ] 9.1 Implement file size checks in preview manager
  - Skip syntax highlighting for files > 1000 lines
  - Add "Large file" warning note
  - Still show line numbers

- [ ] 9.2 Implement line truncation for long lines
  - Truncate lines > 200 chars to 200 + "..."
  - Add title attribute with full line content
  - Only applies to preview popup, not file browser

- [ ] 9.3 Add lazy loading for preview content
  - Don't load file content until hover delay elapses
  - Show loading indicator during file extraction

## 10. Testing and Validation

- [ ] 10.1 Manual test with real mod files containing errors
  - Verify filename hovers show correct files
  - Verify location hovers show correct lines/columns
  - Verify multi-error highlighting works
  - Test with large files (>1000 lines)

- [ ] 10.2 Test edge cases
  - Non-existent filenames (should not be interactive)
  - Errors at line 1 and last line (context window)
  - Errors with no column (line-only highlight)
  - Multiple errors in same line (overlapping highlights)

- [ ] 10.3 Test interaction flows
  - Hover → popup → click → file browser navigation
  - Hover → move away → popup dismisses
  - Hover → press Escape → popup dismisses
  - Rapid hovers (debouncing)

- [ ] 10.4 Cross-browser testing
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Verify popup positioning in all browsers

## 11. Polish and Accessibility

- [ ] 11.1 Add keyboard navigation support
  - Tab through interactive elements in console
  - Enter key opens preview
  - Arrow keys navigate within popup (if needed)

- [ ] 11.2 Add ARIA labels and roles
  - `role="button"` for interactive elements
  - `aria-label` describing action (e.g., "Preview entry.lua")
  - `aria-live="polite"` for popup announcements

- [ ] 11.3 Test with screen reader
  - Verify interactive elements are announced
  - Verify popup content is readable
  - Verify navigation actions are clear

- [ ] 11.4 Final visual polish
  - Smooth transitions and animations
  - Consistent spacing and alignment
  - Color contrast validation (WCAG AA)
