# ONB Mod Analyzer

A production-ready, client-side WebAssembly application for analyzing One Night Battle (ONB) mod files. The analyzer runs entirely in your browser with no server infrastructure required.

## Features

- **🚀 Zero Backend** - Runs completely in browser using WebAssembly
- **📦 Batch Processing** - Analyze multiple mods simultaneously
- **📊 Statistics Tracking** - Aggregate metrics with CSV/XML export
- **🔍 File Browser** - Inspect mod contents with syntax highlighting
- **🕸️ Dependency Graph** - Visualize inter-mod dependencies with D3.js
- **⚡ Version Management** - Compare analyzer versions side-by-side
- **💾 Persistent History** - LocalStorage-backed session management

## Quick Start

### Using the Web Interface

Visit the live deployment at:
```
https://[your-username].github.io/mod-tool-keristerified/
```

1. Drag and drop `.zip` mod files onto the drop zone
2. View analysis results, errors, and warnings
3. Browse mod file structure and contents
4. Track statistics across multiple mods
5. Visualize dependency relationships

### Local Development

#### Prerequisites

- [mise](https://mise.jdx.dev/) - Task runner and environment manager
- [Nix](https://nixos.org/download.html) or nix-portable (auto-installed by mise)

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-repo]/mod-tool-keristerified.git
   cd mod-tool-keristerified
   ```

2. **Install mise**
   ```bash
   curl https://mise.run | sh
   ```

3. **Set up the environment**
   ```bash
   cd src
   mise run setup
   ```
   
   This will automatically install nix-portable if Nix isn't available.

#### Building

**Build both native CLI and WASM module:**
```bash
mise run build:all
```

**Build native CLI only:**
```bash
mise run build:native
```

**Build WASM module only:**
```bash
mise run build:web
```

#### Running

**Run the native CLI:**
```bash
mise run execute -- --path path/to/mod.zip
```

**Serve the web interface locally:**
```bash
mise run serve:web
```

Then open http://localhost:8000 in your browser.

## Architecture

### WASM Bridge

The browser-compatible entry point (`src/DartLangModTool-master/web/main.dart`) wraps the existing CLI tool without modifying the core codebase. It:

- Replaces `dart:io` with browser-compatible alternatives
- Exposes an `analyzeModFile()` function to JavaScript
- Handles CLI arguments dynamically via JS interop
- Captures STDOUT and STDERR for web display

### Build System

**Nix** (`src/default.nix`) provides reproducible builds:
- Native target: Standalone CLI executable
- WASM target: Browser-compatible WebAssembly module
- Automatic dependency vendoring with `autoPubspecLock`

**Mise** (`src/mise.toml`) provides user-friendly task interface:
- Hides Nix complexity from casual users
- Automates nix-portable installation
- Single source of truth for build commands

### Web Interface

**Modular Architecture:**
```
src/web/
├── index.html              # Main HTML structure
├── css/styles.css          # Modern dark theme
├── js/
│   ├── main.mjs           # Application coordinator
│   ├── worker.mjs         # WASM processing (Web Worker)
│   ├── parser.mjs         # JSON parsing utilities
│   └── tabs/              # Tab modules
│       ├── results-tab.mjs      # JSON visualization
│       ├── file-browser-tab.mjs # Mod file explorer
│       ├── statistics-tab.mjs   # Analytics dashboard
│       └── dependencies-tab.mjs # Dependency graph
└── versions/              # Versioned WASM artifacts
    ├── index.json         # Version manifest
    ├── latest/            # Latest build
    └── v1.0.0/            # Specific versions
```

**Tab Module Interface:**

Each tab implements a common interface:
```javascript
class TabModule {
    async init(container)      // Initialize with DOM container
    onFileProcessed(mod)       // Handle new analysis result
    render()                   // Update display
    clear()                    // Reset state
}
```

**Web Worker:**

WASM execution runs in a dedicated worker thread to prevent UI blocking. Processing a 1MB mod takes 1-5 seconds - the worker keeps the interface responsive.

## Usage

### Web Interface

#### Analyzing Mods

1. **Upload**: Drag `.zip` files onto the drop zone or click to select
2. **Process**: Files are queued and processed sequentially
3. **View**: Results appear in the sidebar list
4. **Navigate**: Click any mod to view its analysis

#### Results Tab

- **Summary**: Quick overview of mod metadata
- **JSON Tree**: Collapsible, syntax-highlighted structure
- **Search**: Filter JSON keys and values
- **Export**: Download analysis as JSON file

#### File Browser Tab

- **File Tree**: Navigate mod directory structure
- **Preview**: View Lua scripts, images, and other files
- **Syntax Highlighting**: Color-coded Lua syntax
- **Error Markers**: Red highlighting at error locations
- **Tooltips**: Hover over errors for context

#### Statistics Tab

- **Overview**: Success rate, processing times, error counts
- **Charts**: Visual analytics with bars and percentages
- **Error Analysis**: Most common errors by type
- **Export**: Download as CSV or XML

#### Dependencies Tab

- **Interactive Graph**: D3.js force-directed layout
- **Zoom & Pan**: Navigate large dependency networks
- **Circular Detection**: Automatically highlights dependency cycles
- **Export**: Save as PNG image or JSON data

### CLI Usage

```bash
# Analyze a single mod
mise run execute -- --path my-mod.zip --out ./output

# Batch analyze all mods in a directory
mise run execute -- --path ./mods/ --batch --out ./output

# Silent mode (no console output)
mise run execute -- --path my-mod.zip --silent

# Dry run (validate without writing files)
mise run execute -- --path my-mod.zip --dry
```

**Options:**
- `--path, -p` : Path to mod file or directory (required)
- `--out, -o` : Output directory for JSON files (default: `.`)
- `--err, -e` : Error output file path (default: `error.txt`)
- `--batch, -b` : Analyze all mods in directory
- `--silent, -s` : Disable console output
- `--dry, -d` : Dry run only (no file writes)
- `--version, -v` : Display version info
- `--help, -h` : Show help message

## Deployment

### Manual Deployment

1. **Trigger the workflow** in GitHub Actions:
   - Go to Actions → Deploy ONB Mod Analyzer
   - Click "Run workflow"
   - Enter version number (e.g., `1.2.3`)

2. **Automated process**:
   - Builds WASM with Nix
   - Creates versioned directory
   - Updates version index
   - Deploys to GitHub Pages

### Automatic Deployment

The workflow can be triggered programmatically:

```bash
gh workflow run deploy.yml -f version=1.2.3
```

## Version Management

### Adding a New Version

Versions are stored in `src/web/versions/`:

```
versions/
├── index.json          # Version manifest
├── latest/             # Latest build
└── v1.0.0/            # Specific version
```

**To create a new version:**

1. Build WASM: `mise run build:web`
2. Copy artifacts: `cp -r web/versions/latest web/versions/v1.2.3`
3. Update `index.json`:
   ```json
   [
     {
       "version": "v1.2.3",
       "latest": true,
       "buildDate": "2025-01-15T10:00:00Z",
       "features": ["mod-analysis", "lua-parsing"],
       "description": "Added feature X"
     }
   ]
   ```

### Comparing Versions

Users can select different versions from the dropdown to:
- Test if updates break their mods
- Compare analysis output across versions
- Validate bug fixes

## Development

### Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages deployment
├── openspec/                    # OpenSpec documentation
│   ├── AGENTS.md               # AI agent instructions
│   ├── project.md              # Project overview
│   └── changes/                # Change proposals
├── src/
│   ├── default.nix             # Nix build system
│   ├── mise.toml               # Task automation
│   ├── DartLangModTool-master/ # Core analyzer (submodule)
│   │   ├── bin/                # CLI entry point
│   │   ├── lib/                # Core library
│   │   ├── web/                # WASM bridge
│   │   └── pubspec.yaml        # Dart dependencies
│   └── web/                    # Web interface
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── versions/
└── README.md
```

### Adding Features

1. **Create proposal** in `openspec/changes/`
2. **Implement changes** following OpenSpec guidelines
3. **Update tests** if applicable
4. **Build and verify** with `mise run build:all`
5. **Deploy** via GitHub Actions

### Troubleshooting

**Build fails with "dart:io" errors:**
- Ensure `web/main.dart` doesn't import `dart:io`
- Use `dart:typed_data` and `archive` package instead

**WASM module doesn't load:**
- Check browser console for errors
- Verify WASM file size (should be ~5-15MB)
- Ensure Web Worker is not blocked by CSP

**Statistics not persisting:**
- Check localStorage quota (5-10MB typical)
- Export data regularly to avoid loss
- Clear old data if quota exceeded

**Dependency graph not rendering:**
- Ensure D3.js is loaded (check network tab)
- Verify JSON structure has `dependencies` field
- Check console for JavaScript errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow OpenSpec conventions (see `openspec/AGENTS.md`)
4. Submit a pull request

## License

Permission is hereby granted to the ONB community to use this tool to analyze, info dump, and upgrade their mods.

## Credits

- **Original DartLangModTool**: [TheMaverickProgrammer](https://github.com/TheMaverickProgrammer)
- **WASM Integration**: Built with dart2wasm
- **UI Framework**: Vanilla JavaScript with ES6 modules
- **Visualization**: D3.js for dependency graphs
- **Build System**: Nix + mise

## Links

- **Live Demo**: https://[username].github.io/mod-tool-keristerified/
- **Source Code**: https://github.com/[username]/mod-tool-keristerified
- **Issue Tracker**: https://github.com/[username]/mod-tool-keristerified/issues
- **Original Tool**: https://github.com/TheMaverickProgrammer/DartLangModTool
