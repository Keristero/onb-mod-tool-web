# Project Context

## Purpose
Build a production-ready, fully client-side static website for analyzing Open NetBattle (ONB) mod files. The tool helps mod creators validate their mods, identify errors, visualize dependencies, and compare analyzer versions—all without server infrastructure.

## Tech Stack
- **Core Language**: Dart (DartLangModTool-master)
- **Build System**: Nix (reproducible builds), mise (task automation)
- **Web**: Vanilla JavaScript, Web Workers, WebAssembly (dart2wasm)
- **Libraries**: JSZip (file extraction), highlight.js (syntax), D3.js (graphs)
- **Deployment**: GitHub Actions → GitHub Pages

## Project Conventions

### Code Style
- **Dart**: Follow official Dart style guide, use dartfmt
- **JavaScript**: ES6+ modules, no frameworks, functional style preferred
- **CSS**: BEM-like naming, mobile-first responsive design
- **Line limit**: Prefer <100 lines per function, split complex logic

### Architecture Patterns
- **Separation of concerns**: ES6 modules (.mjs) per responsibility: main.mjs (coordination), worker.mjs (WASM), parser.mjs (JSON), tabs/*.mjs (UI per tab)
- **Tab module interface**: Common interface (init, render, clear, onFileProcessed) for consistent lifecycle
- **WASM bridge pattern**: Single web/main.dart wraps CLI without core modifications
- **Web Workers**: Isolate heavy processing from UI thread
- **Lazy loading**: Load WASM versions on-demand, not upfront
- **Simplicity first**: Avoid over-engineering, no unnecessary abstractions

### Testing Strategy
- **Manual testing**: Focus on real mod files, maintain test fixture library
- **WASM validation**: Ensure compilation succeeds, module instantiates
- **Cross-browser**: Test on Chrome, Firefox, Safari latest versions
- **Performance**: Track processing times, aim for <5s per typical mod

### Git Workflow
- **Branch**: feature/<name> for new work
- **Commits**: Conventional Commits format (feat:, fix:, docs:)
- **Submodule**: DartLangModTool-master will be a submodule (not yet configured)
- **Deployment**: Manual GitHub Actions trigger creates versioned releases

## Domain Context

### ONB Mod Files
- Zip archives containing Lua scripts, images, audio, and metadata
- Structure: package.toml (or similar), entry.lua, assets/
- Types: cards, mobs, blocks, libraries, player customization
- Dependencies: Mods can require other mods via package IDs

### DartLangModTool
- Custom Lua interpreter built from scratch for mod analysis
- Performs static analysis to detect errors, compatibility issues
- Outputs JSON with mod metadata, errors, warnings, file references
- CLI tool with options like --batch, --silent, --path, --out

### Analysis Challenges
- Mods can be large (10-100MB with many assets)
- Complex Lua scripts with metatable manipulation
- Circular dependencies are common issues
- Error messages need line:column precision for developer UX

## Important Constraints

### Technical
- **No server**: Everything must run client-side (privacy, cost, simplicity)
- **WASM size**: dart2wasm produces 5-15MB files (mitigate with gzip, caching)
- **Browser APIs only**: No dart:io, use dart:typed_data and archive package
- **localStorage quota**: ~5-10MB limit, require periodic XML export

### Maintainability
- **Zero core modifications**: WASM bridge must work without changing DartLangModTool
- **Submodule updates**: Should be seamless, no build system changes required
- **Version compatibility**: Support running old analyzer versions for comparison

### User Experience
- **Offline capable**: Once loaded, no internet needed
- **Fast feedback**: Show progress during analysis, don't freeze UI
- **Clear errors**: Visualize errors in context, link to files

## External Dependencies

### Required
- **Nix** (or nix-portable): Build system, handles Dart SDK and dependencies
- **mise**: Task runner, provides user-friendly build commands
- **JSZip**: JavaScript library for extracting mod zip files
- **highlight.js**: Syntax highlighting for code preview
- **D3.js**: Force-directed graph layout for dependency visualization

### Optional
- **GitHub Pages**: Static hosting (can use any static host)
- **GitHub Actions**: CI/CD for automated builds (can build locally)

## Repository Structure
```
/src/                          # Main workspace (treat as submodule root)
  /DartLangModTool-master/     # Upstream tool (will be git submodule)
    /web/                      # WASM bridge entry point
      main.dart                # Browser-compatible entry point
  /web/                        # Static website
    /versions/                 # Versioned WASM builds
      /v1.0.0/                 # Specific version artifacts (.wasm, .mjs, metadata.json)
      /v1.1.0/                 # Auto-discovered, newest = default
    /js/                       # JavaScript modules
      main.mjs                 # Entry point & coordination
      worker.mjs               # Web Worker for WASM
      parser.mjs               # JSON parsing utilities
      /tabs/                   # Tab module implementations
        results-tab.mjs        # JSON tree view & results
        file-browser-tab.mjs   # File explorer with error highlighting
        statistics-tab.mjs     # Charts, metrics, CSV export
        dependencies-tab.mjs   # D3.js dependency graph
    /css/                      # Stylesheets
      styles.css
    index.html
  default.nix                  # Nix build derivation
  mise.toml                    # Task automation config
  README.md                    # User instructions

/openspec/                     # OpenSpec specs and proposals
/old-interpreter-and-website/  # Reference implementation (archived)
```
