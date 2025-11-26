# ONB Mod Tool - Keristerified

A modern, browser-based WebAssembly analyzer for One Night Battle (ONB) mod files. This is a complete reimplementation of the mod analysis system with production-ready features, automated builds, and a clean web interface.

## 🎯 What This Is

A fully client-side static website that analyzes ONB mod files using WebAssembly, with no server infrastructure required. Features batch processing, statistics tracking, dependency visualization, and version comparison.

## ✨ Key Features

- **Zero Backend** - Runs entirely in browser via WASM
- **Batch Processing** - Process multiple mods simultaneously
- **Rich Visualization** - Interactive JSON explorer, file browser, and dependency graphs
- **Statistics Dashboard** - Track metrics with CSV/XML export
- **Version Management** - Compare analyzer versions side-by-side
- **Automated Deployment** - GitHub Actions → GitHub Pages

## 🚀 Quick Start

**Using the Web Interface:**

Visit the live deployment (once deployed):
```
https://keristero.github.io/mod-tool-keristerified/
```

**Local Development:**

```bash
cd src
mise run setup      # Install dependencies
mise run build:all  # Build everything
mise run serve:web  # Start local server
```

See [`src/README.md`](src/README.md) for detailed documentation.

## 📁 Project Structure

```
.
├── .github/workflows/     # GitHub Actions for deployment
├── openspec/             # OpenSpec documentation & specs
├── src/
│   ├── default.nix       # Nix build system
│   ├── mise.toml         # Task automation
│   ├── DartLangModTool-master/  # Core analyzer
│   │   ├── bin/          # CLI entry point
│   │   ├── lib/          # Analysis library
│   │   └── web/          # WASM bridge
│   └── web/              # Web interface
│       ├── index.html
│       ├── js/           # ES6 modules
│       ├── css/          # Modern dark theme
│       └── versions/     # Versioned WASM builds
└── README.md             # This file
```

## 🏗️ Architecture

### Three-Layer System

1. **Core Analyzer** (`DartLangModTool-master/`)
   - Original Dart-based mod analysis tool
   - Lua interpreter and mod parser
   - CLI interface

2. **WASM Bridge** (`DartLangModTool-master/web/main.dart`)
   - Browser-compatible wrapper
   - No modifications to core code
   - JS interop for browser integration

3. **Web Interface** (`src/web/`)
   - Modern ES6 modules
   - Tab-based UI (Results, Files, Stats, Dependencies)
   - Web Worker for non-blocking processing

### Build Pipeline

```
Dart Source → Nix Build → WASM/MJS → GitHub Pages
                ↓
            mise tasks (user interface)
```

## 🛠️ Technology Stack

- **Language**: Dart (WASM), JavaScript (ES6 modules)
- **Build**: Nix + mise for reproducible builds
- **UI**: Vanilla JS, no frameworks
- **Visualization**: D3.js for graphs, highlight.js for syntax
- **Deployment**: GitHub Actions → GitHub Pages
- **Storage**: Browser localStorage

## 📚 Documentation

- **[Implementation Guide](src/README.md)** - Detailed setup, usage, and development
- **[OpenSpec Proposal](openspec/changes/build-wasm-mod-analyzer/)** - Design decisions and specifications
- **[Tasks](openspec/changes/build-wasm-mod-analyzer/tasks.md)** - Complete implementation checklist

## 🔧 Development Workflow

1. **Make changes** in appropriate directory
2. **Build**: `mise run build:web`
3. **Test locally**: `mise run serve:web`
4. **Deploy**: GitHub Actions workflow (manual trigger)

## 🎨 Design Philosophy

- **No Backend** - Everything runs in browser
- **No Modifications** - WASM bridge doesn't alter core code
- **Modern Stack** - Native ES6, CSS Grid, modern APIs
- **Modular** - Tab interface with common contract
- **Automated** - Reproducible builds, one-click deployment

## 🚢 Deployment

Deployments are triggered manually via GitHub Actions:

```bash
gh workflow run deploy.yml -f version=1.2.3
```

Or through the GitHub UI: Actions → Deploy ONB Mod Analyzer → Run workflow

## 🤝 Contributing

1. Read [`openspec/AGENTS.md`](openspec/AGENTS.md) for conventions
2. Create proposal in `openspec/changes/`
3. Implement following OpenSpec guidelines
4. Submit pull request

## 📝 License

Permission is hereby granted to the ONB community to use this tool to analyze, info dump, and upgrade their own mods.

## 🙏 Credits

- **Original Tool**: [TheMaverickProgrammer/DartLangModTool](https://github.com/TheMaverickProgrammer/DartLangModTool)
- **Keristerified Version**: Complete modernization with WASM, web interface, and automated deployment

## 🔗 Links

- **Live Demo**: https://keristero.github.io/mod-tool-keristerified/
- **Source Code**: https://github.com/keristero/mod-tool-keristerified
- **Original Tool**: https://github.com/TheMaverickProgrammer/DartLangModTool

---

Built with ❤️ for the ONB community
