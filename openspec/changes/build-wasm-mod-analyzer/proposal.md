# Change: Build WebAssembly Mod Analyzer

## Why
The ONB mod community needs a production-ready, client-side static website that analyzes mod files without server infrastructure. The existing prototype demonstrates feasibility but requires modernization with the latest DartLangModTool version, automated build tooling, enhanced UX features, and streamlined deployment.

## What Changes
- Create WASM bridge adapter for DartLangModTool-master that works in browsers without `dart:io`
- Implement Nix build system with native and web compilation targets
- Add mise.toml automation for setup, build, and execution
- Build modular web interface with enhanced JSON visualization and file preview
- Implement batch processing for multiple mod files
- Add statistics tracking and aggregated reporting with XML export
- Create interactive dependency graph visualization for inter-mod dependencies
- Support multiple WASM version loading for comparison
- Automate versioned deployment via GitHub Actions to GitHub Pages

## Impact
- Affected specs: wasm-bridge, nix-build, mise-automation, web-interface, batch-processing, statistics-tracking, dependency-graph, version-management, deployment-workflow
- Affected code: New code in src/DartLangModTool-master/web/ (WASM bridge), src/default.nix (build), src/mise.toml (automation), src/web/ (website), .github/workflows/ (CI/CD)
