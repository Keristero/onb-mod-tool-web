# Design: WebAssembly Mod Analyzer

## Context
The ONB mod community needs a fully client-side static website for analyzing mod files. This builds on a proven prototype while modernizing for production with the latest DartLangModTool version. The system must work entirely in browsers without server infrastructure, support batch processing, track statistics, and be easily deployable via GitHub Pages.

## Goals / Non-Goals

### Goals
- Zero backend infrastructure - runs entirely in browser
- Automated build and deployment pipeline
- Support for comparing different analyzer versions
- Rich UX with error visualization and dependency graphs
- Seamless upgrades of DartLangModTool without code changes

### Non-Goals
- Server-side processing or storage
- Mobile app versions (web-first, mobile-accessible)
- Real-time collaboration features
- Mod editing or modification capabilities

## Decisions

### Decision: WASM Bridge Pattern
**What**: Create a single `web/main.dart` file that wraps the existing CLI tool for browser use without modifying core code.

**Why**: 
- Keeps the bridge separate from upstream DartLangModTool codebase
- Enables seamless updates when DartLangModTool is a submodule
- Minimizes maintenance burden for upstream maintainers
- Single file is easy to audit and understand

**Alternatives considered**:
- Fork and modify core code: Rejected due to merge complexity
- Server-side API: Rejected due to hosting costs and latency

### Decision: Nix + Mise Build System
**What**: Use Nix for reproducible builds with mise tasks as the user-facing interface.

**Why**:
- Nix provides deterministic, reproducible builds across platforms
- mise tasks hide Nix complexity from casual users
- nix-portable enables use without system Nix installation
- Single source of truth for both native and WASM builds

**Alternatives considered**:
- Docker builds: More heavyweight, harder to install locally
- Plain shell scripts: Not reproducible, dependency management issues
- Dart SDK only: Doesn't handle system dependencies well

### Decision: Web Workers for WASM Processing
**What**: Run WASM module in a dedicated Web Worker thread.

**Why**:
- Prevents UI blocking during analysis (files can take 1-5 seconds)
- Isolates WASM memory from main thread
- Enables timeout handling for problematic files
- Allows parallel processing in future (one worker per file)

**Alternatives considered**:
- Main thread execution: Rejected due to UI freezing
- SharedArrayBuffer: Rejected due to browser security restrictions

### Decision: Tab-Based Interface with Module per Tab
**What**: Separate concerns into Results, File Browser, Statistics, and Dependencies tabs, each in its own .mjs module with a common interface.

**Why**:
- Clear separation of different workflows and single responsibility per module
- Reduces visual clutter compared to single-page layout
- Each tab can be optimized and tested independently
- Common interface (init, render, clear, onFileProcessed) enables consistent lifecycle
- Easy to add new tabs by implementing the interface
- ES6 modules (.mjs) provide native import/export without bundler

**Alternatives considered**:
- Single scrolling page: Too cluttered with many files
- Modal dialogs: Awkward for frequent switching

### Decision: D3.js for Dependency Graph
**What**: Use D3.js for force-directed graph visualization.

**Why**:
- Mature, well-documented library
- Force simulation creates readable layouts automatically
- Extensive examples for reference
- Lightweight compared to full graph frameworks

**Alternatives considered**:
- Cytoscape.js: More complex, overkill for simple dependency graphs
- Custom canvas rendering: Too much effort for marginal benefit

### Decision: localStorage for Statistics
**What**: Store all statistics in browser localStorage with periodic XML export.

**Why**:
- No server required
- Data persists across sessions
- Large quota (5-10MB typical)
- Users control their data

**Alternatives considered**:
- IndexedDB: Overkill for simple key-value storage
- Session-only: Loss of historical data on page close

### Decision: Versioned WASM Artifacts
**What**: Store each WASM build in `web/versions/<version>/` with dynamic loading.

**Why**:
- Compare behavior across analyzer versions
- Maintain backward compatibility
- Users can validate if updates broke their mods
- Easy rollback if issues found

**Alternatives considered**:
- Single version only: Users can't verify regressions
- Server-side version switching: Adds complexity, latency

## Risks / Trade-offs

### Risk: WASM File Size
- **Concern**: dart2wasm can produce 5-15MB files
- **Mitigation**: Gzip compression on GitHub Pages (reduces to ~2MB), lazy loading of versions, browser caching
- **Trade-off**: Initial load time vs offline capability

### Risk: Browser Compatibility
- **Concern**: WASM and Web Workers require modern browsers
- **Mitigation**: Display clear error messages on unsupported browsers, target Chrome 90+, Firefox 88+, Safari 15+
- **Trade-off**: Cutting-edge features vs broad compatibility

### Risk: localStorage Quota Limits
- **Concern**: Statistics could fill localStorage with heavy use
- **Mitigation**: Warn at 80% capacity, provide clear data management UI, encourage regular XML exports
- **Trade-off**: Convenience vs storage limits

### Risk: DartLangModTool Breaking Changes
- **Concern**: JSON output format changes could break parsing
- **Mitigation**: Version each parser, detect format changes, graceful degradation with schema validation
- **Trade-off**: Maintenance effort vs robustness

## Migration Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. Create WASM bridge and verify compilation
2. Set up Nix build system
3. Implement mise tasks
4. Create basic web interface with single-file analysis

### Phase 2: Enhanced Features (Week 3-4)
5. Add file browser and error highlighting
6. Implement batch processing queue
7. Build statistics tracking and dashboard
8. Add CLI options discovery

### Phase 3: Advanced Features (Week 5-6)
9. Create dependency graph visualization
10. Implement version management
11. Add XML export and localStorage management

### Phase 4: Deployment (Week 7)
12. Create GitHub Actions workflow
13. Test deployment pipeline
14. Deploy initial production version
15. Document usage and publish

### Rollback Strategy
- Keep old prototype accessible at separate URL
- Version selector allows choosing any previous version
- GitHub Pages history enables quick rollback
- Local builds always possible via Nix

## Open Questions
- Should we support saving analysis results as downloadable JSON for sharing?
- Do we need authentication for GitHub Pages deployment or is manual trigger sufficient?
- Should the dependency graph support filtering by mod type or other attributes?
- Is there interest in a "compare mods" feature that diffs two mod structures?
