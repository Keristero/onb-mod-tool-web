# Change: Enhanced Error Analysis UI

## Why
Currently, error messages in the console output are plain text buried at the bottom of the results tab, making it difficult for mod developers to quickly identify, understand, and navigate to error locations in their code. This leads to frustration and slower debugging cycles, especially when errors reference specific file locations (e.g., `file.lua:24:39`).

## What Changes
Add interactive error analysis capabilities to the results tab:
- **Console-first layout**: Move console output to the top of results tab for immediate visibility
- **Interactive file previews**: Hover over filenames in console to see inline file preview
- **Location highlighting**: Hover over error locations (e.g., `[24:39]`) to preview exact line with character-level highlighting
- **Error aggregation**: Hovering filenames highlights all errors in that file
- **Quick navigation**: Click any preview to open full file in file browser tab

These changes reuse the existing file preview component from file-browser-tab, making it available as a shared utility for both tabs.

## Impact
- **Affected specs**: error-visualization (new)
- **Affected code**:
  - `src/web/js/tabs/results-tab.mjs` - Layout reordering, error interaction handlers
  - `src/web/js/tabs/file-browser-tab.mjs` - Extract preview component to shared module
  - `src/web/js/preview-manager.mjs` (new) - Shared file preview component
  - `src/web/css/styles.css` - Hover preview styles, animations
- **Breaking changes**: None (purely additive UX enhancements)
