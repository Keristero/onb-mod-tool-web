# Mise Tasks Quick Reference

This file provides a quick reference for all available mise tasks.

## Setup

### `mise run setup`
Set up the build environment with nix-portable.

**When to use**: First time setup, or if build environment is broken.

**What it does**:
- Checks for Nix installation
- Downloads nix-portable if Nix not found
- Configures environment for builds

## Building

### `mise run build:native`
Build the native CLI executable.

**Output**: `result-native/bin/onb_mod_file`

**Use case**: Local CLI testing, development

### `mise run build:web`
Build the WebAssembly module for browser.

**Output**: 
- `web/versions/latest/onb_mod_file.wasm`
- `web/versions/latest/onb_mod_file.mjs`
- `web/versions/latest/metadata.json`

**Use case**: Web interface development, deployment preparation

### `mise run build:all`
Build both native and web targets.

**Use case**: Complete rebuild, CI/CD

## Running

### `mise run execute -- [args]`
Run the native CLI with arguments.

**Examples**:
```bash
# Analyze single mod
mise run execute -- --path my-mod.zip

# Batch analyze directory
mise run execute -- --path ./mods/ --batch

# Silent mode
mise run execute -- --path my-mod.zip --silent

# Dry run
mise run execute -- --path my-mod.zip --dry
```

**Use case**: CLI testing, mod analysis

### `mise run serve:web`
Start local HTTP server for web interface.

**URL**: http://localhost:8000

**Use case**: Web development, local testing

## Maintenance

### `mise run clean`
Remove all build artifacts.

**Removes**:
- `result-native/`
- `result-wasm/`
- `result/`

**Use case**: Clean slate before rebuild

### `mise run docs`
Generate task documentation.

**Output**: `TASKS.md`

**Use case**: Update documentation after adding tasks

## Workflow Examples

### First Time Setup
```bash
cd src
mise run setup
mise run build:all
mise run serve:web
```

### Development Workflow
```bash
# Make changes to code
mise run build:web
mise run serve:web
# Test in browser
```

### CLI Testing
```bash
mise run build:native
mise run execute -- --path test-mod.zip
```

### Full Rebuild
```bash
mise run clean
mise run build:all
```

### Pre-Deployment Check
```bash
mise run build:web
mise run serve:web
# Verify everything works
# Then trigger GitHub Actions
```

## Task Dependencies

```
setup (base)
  ↓
build:native
build:web
  ↓
build:all
execute (depends on build:native)
```

## Environment Variables

These are set automatically by tasks:

- `NIX_CMD` - Set to either `nix` or `nix-portable nix`
- `PATH` - Updated to include `~/.local/bin` for nix-portable

## Troubleshooting

### "nix not found"
**Run**: `mise run setup`

### "Build failed"
**Try**:
1. `mise run clean`
2. `mise run setup`
3. `mise run build:web`

### "Permission denied"
**Check**: `~/.local/bin` should be in PATH
**Fix**: `source ~/.bashrc` or restart terminal

### "WASM module not loading"
**Check**: 
1. Files exist in `web/versions/latest/`
2. Browser console for errors
3. CORS if serving from custom server

## Adding Custom Tasks

Edit `src/mise.toml`:

```toml
[tasks.my-task]
description = "My custom task"
depends = ["setup"]  # Optional
run = '''
#!/usr/bin/env bash
set -euo pipefail

# Your commands here
'''
```

Then run:
```bash
mise run my-task
```

## Getting More Help

```bash
# List all tasks
mise tasks

# Show task details
mise task info build:web

# Show mise help
mise --help
```

For more information, see `src/README.md`.
