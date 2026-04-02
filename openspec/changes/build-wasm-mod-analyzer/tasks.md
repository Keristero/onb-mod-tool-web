# Implementation Tasks

## 1. WASM Bridge Development
- [x] 1.1 Create `src/DartLangModTool-master/web/main.dart` as browser-compatible entry point
- [x] 1.2 Implement dynamic CLI argument handling via JS interop without modifying core codebase
- [x] 1.3 Replace `dart:io` dependencies with browser-compatible alternatives (typed_data, archive)
- [x] 1.4 Expose `analyzeModFile` function to JS with Uint8Array input and JSON string output
- [x] 1.5 Test WASM compilation and ensure no dart:io imports leak through

## 2. Build System
- [x] 2.1 Create `src/default.nix` with native and web build targets
- [x] 2.2 Configure dart2wasm compilation for browser environment
- [x] 2.3 Set up dependency vendoring with autoPubspecLock
- [x] 2.4 Ensure web build outputs .wasm and .mjs files to `src/web/versions/latest/`
- [x] 2.5 Verify native build produces working CLI executable

## 3. Mise Automation
- [x] 3.1 Create `src/mise.toml` with nix-portable setup task
- [x] 3.2 Add build:native task for CLI compilation
- [x] 3.3 Add build:web task for WASM compilation with file copying
- [x] 3.4 Add run:native task for testing CLI
- [x] 3.5 Generate task documentation using mise's built-in templating (mise generate task-docs)
- [x] 3.6 Document mise installation and usage in README.md

## 4. Web Interface Foundation
- [x] 4.1 Create modular src/web/ structure: index.html, js/main.mjs (entry point), js/worker.mjs (WASM processing), js/parser.mjs (JSON handling), css/styles.css
- [x] 4.2 Create tab modules: js/tabs/results-tab.mjs, js/tabs/file-browser-tab.mjs, js/tabs/statistics-tab.mjs, js/tabs/dependencies-tab.mjs
- [x] 4.3 Define common tab interface: init(), render(), clear(), onFileProcessed(result)
- [x] 4.4 Implement drag-and-drop file upload UI in main.mjs
- [x] 4.5 Set up Web Worker for WASM processing in worker.mjs

## 5. JSON Visualization (results-tab.mjs)
- [x] 5.1 Parse JSON output from new DartLangModTool version in parser.mjs
- [x] 5.2 Implement collapsible tree view for JSON structure in results-tab.mjs
- [x] 5.3 Add syntax highlighting for values
- [x] 5.4 Create search/filter functionality within results tab

## 6. Enhanced File Preview (file-browser-tab.mjs)
- [x] 6.1 Integrate JSZip for mod file extraction in file-browser-tab.mjs
- [x] 6.2 Build file browser with folder navigation
- [x] 6.3 Implement syntax highlighting with line numbers
- [x] 6.4 Add error highlighting at line:column positions from JSON errors
- [x] 6.5 Create hover tooltips for error context

## 7. Batch Processing (main.mjs coordination)
- [x] 7.1 Support multiple file selection from file picker in main.mjs
- [x] 7.2 Implement drag-and-drop for multiple files
- [x] 7.3 Create processing queue with progress indicators
- [x] 7.4 Store all results for aggregation and distribute to tabs via onFileProcessed()
- [x] 7.5 Display processed mods in a persistent list with clickable entries
- [x] 7.6 Implement name-based filtering for mod history list
- [x] 7.7 Enable viewing previous mod results by clicking list entries

## 8. Statistics & Reporting (statistics-tab.mjs)
- [x] 8.1 Track per-file metrics in statistics-tab.mjs: success/failure, error counts, error types, processing time
- [x] 8.2 Build dashboard UI with aggregated data visualization
- [x] 8.3 Implement aggregated charts: success rate, most common errors, error frequency
- [x] 8.4 Add CSV export functionality for statistics
- [x] 8.5 Store statistics in browser localStorage for persistence
- [x] 8.6 Add XML export functionality for statistics

## 9. CLI Options Discovery
- [x] 9.1 Parse --help output from WASM module to discover options dynamically
- [x] 9.2 Generate UI controls for each discovered option
- [x] 9.3 Handle STDOUT alongside JSON output
- [x] 9.4 Support option persistence in localStorage

## 10. Dependency Graph (dependencies-tab.mjs)
- [x] 10.1 Extract package.id and dependencies from JSON results in dependencies-tab.mjs
- [x] 10.2 Integrate D3.js for force-directed graph rendering
- [x] 10.3 Create directed graph with nodes as mods and edges as dependencies
- [x] 10.4 Add interactive zoom, pan, and node selection
- [x] 10.5 Highlight circular dependencies with warning colors
- [x] 10.6 Add PNG and JSON export functionality

## 11. Version Management
- [x] 11.1 Structure web/versions/ directory: latest/, v1.0.0/, etc.
- [x] 11.2 Implement version selector dropdown
- [x] 11.3 Load selected WASM/MJS files dynamically
- [x] 11.4 Display version metadata (build date, features)
- [x] 11.5 Create version index.json manifest

## 12. GitHub Deployment Workflow
- [x] 12.1 Create .github/workflows/deploy.yml with manual trigger
- [x] 12.2 Accept version number input parameter
- [x] 12.3 Build WASM using Nix in GitHub Actions runner
- [x] 12.4 Copy artifacts to web/versions/<version>/
- [x] 12.5 Deploy entire web/ directory to GitHub Pages
- [x] 12.6 Update version index JSON automatically
- [x] 12.7 Add build verification and health checks
- [x] 12.8 Generate deployment summaries

## 13. Testing & Validation
- [x] 13.1 Test WASM bridge with sample mod files
- [x] 13.2 Verify all CLI options work through web interface
- [x] 13.3 Test batch processing with 10+ files
- [x] 13.4 Validate statistics accuracy
- [x] 13.5 Test cross-browser compatibility (Chrome, Firefox, Safari)

## 14. Documentation
- [x] 14.1 Create src/README.md with mise installation instructions
- [x] 14.2 Document available mise tasks
- [x] 14.3 Add inline code comments for WASM bridge
- [x] 14.4 Create web interface user guide
- [x] 14.5 Document architecture and design decisions
- [x] 14.6 Add troubleshooting section
- [x] 14.7 Document deployment workflow
