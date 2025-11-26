# Contributing to ONB Mod Analyzer

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

1. **Install mise**: https://mise.jdx.dev/
   ```bash
   curl https://mise.run | sh
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/keristero/mod-tool-keristerified.git
   cd mod-tool-keristerified/src
   ```

3. **Set up environment**:
   ```bash
   mise run setup
   ```

### Building

```bash
# Build everything
mise run build:all

# Build only native CLI
mise run build:native

# Build only WASM for web
mise run build:web
```

### Testing Locally

```bash
# Serve web interface
mise run serve:web

# Test native CLI
mise run execute -- --path /path/to/mod.zip
```

## Project Structure

```
src/
├── DartLangModTool-master/  # Core analyzer (don't modify directly)
│   └── web/main.dart        # WASM bridge (OK to modify)
├── web/                     # Web interface (main development area)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/
│   │   ├── main.mjs
│   │   ├── worker.mjs
│   │   ├── parser.mjs
│   │   └── tabs/           # Tab modules
│   └── versions/
├── default.nix             # Build system
└── mise.toml               # Task automation
```

## Making Changes

### Follow OpenSpec

This project uses OpenSpec for change management. Before making changes:

1. Read `openspec/AGENTS.md` for conventions
2. Check `openspec/project.md` for project overview
3. Review existing specs in `openspec/changes/`

### For New Features

1. **Create a proposal** in `openspec/changes/your-feature/`
   - `proposal.md` - Why and what changes
   - `design.md` - How it works
   - `tasks.md` - Implementation checklist
   - `specs/` - Detailed specifications

2. **Discuss** the proposal in an issue

3. **Implement** following the spec

4. **Test** thoroughly

5. **Document** in README.md

### Code Style

#### JavaScript (ES6 Modules)

```javascript
// Use modern ES6 features
import * as parser from './parser.mjs';

export default class MyTab {
    constructor() {
        this.state = {};
    }
    
    async init(container) {
        // Initialization
    }
    
    render() {
        // Rendering logic
    }
}
```

**Guidelines:**
- Use `.mjs` extension for modules
- Use `async/await` over promises
- Prefer `const` over `let`
- Use template literals for strings
- Comment complex logic
- Keep functions small and focused

#### CSS

```css
/* Use CSS variables for theming */
.my-component {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
}

/* Mobile-first responsive design */
@media (max-width: 1024px) {
    .my-component {
        /* Mobile styles */
    }
}
```

**Guidelines:**
- Use CSS variables (see `:root` in styles.css)
- Follow existing naming conventions
- Keep specificity low
- Use Grid and Flexbox over floats
- Test responsive behavior

#### Dart (WASM Bridge)

```dart
// Browser-compatible code only
import 'dart:js_interop';
import 'dart:typed_data';
// NO dart:io!

@JSExport()
String myFunction(JSUint8Array bytes) {
    // Implementation
}
```

**Guidelines:**
- Never import `dart:io`
- Use `dart:typed_data` for byte arrays
- Use `@JSExport()` for JS-exposed functions
- Handle errors gracefully
- Return JSON strings

### Tab Module Interface

New tabs must implement this interface:

```javascript
export default class MyTab {
    constructor() {
        // Initialize state
    }
    
    async init(container) {
        // Set up DOM, event listeners
        this.container = container;
    }
    
    onFileProcessed(mod) {
        // Handle new mod analysis result
        // Store mod data, don't render yet
    }
    
    render() {
        // Update display with current data
        // Only called when tab is visible
    }
    
    clear() {
        // Reset state
        // Clear any stored data
    }
}
```

## Testing

### Manual Testing Checklist

Before submitting a PR:

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test with small mod file (<100KB)
- [ ] Test with large mod file (>1MB)
- [ ] Test with multiple files
- [ ] Test with invalid zip file
- [ ] Test all tabs
- [ ] Test version switching
- [ ] Test localStorage persistence
- [ ] Test all export functions

### WASM Build Test

```bash
cd src
mise run build:web

# Check artifacts
ls -lh web/versions/latest/
# Should see: onb_mod_file.wasm, onb_mod_file.mjs, metadata.json
```

### Local Server Test

```bash
mise run serve:web
# Open http://localhost:8000
# Upload a mod file
# Check browser console for errors
```

## Submitting Changes

### Pull Request Process

1. **Fork** the repository

2. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make changes** following the guidelines

4. **Test thoroughly**

5. **Commit** with clear messages:
   ```bash
   git commit -m "Add: Feature X for improved Y"
   ```

6. **Push** to your fork:
   ```bash
   git push origin feature/my-feature
   ```

7. **Open Pull Request** with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots (for UI changes)
   - Testing notes

### Commit Message Format

```
Type: Brief description

Detailed explanation if needed.

- Bullet points for multiple changes
- Another change
```

**Types:**
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Improve existing feature
- `Refactor:` Code restructure
- `Docs:` Documentation only
- `Style:` Formatting, no code change
- `Test:` Adding tests

## Common Tasks

### Adding a New Tab

1. Create `src/web/js/tabs/my-tab.mjs`:
   ```javascript
   export default class MyTab {
       async init(container) { /* ... */ }
       onFileProcessed(mod) { /* ... */ }
       render() { /* ... */ }
       clear() { /* ... */ }
   }
   ```

2. Import in `src/web/js/main.mjs`:
   ```javascript
   import MyTab from './tabs/my-tab.mjs';
   
   this.tabs = {
       results: new ResultsTab(),
       mytab: new MyTab(),  // Add here
       // ...
   };
   ```

3. Add HTML in `src/web/index.html`:
   ```html
   <button class="tab" data-tab="mytab">My Tab</button>
   
   <div class="tab-content" id="tab-mytab">
       <div class="tab-panel"></div>
   </div>
   ```

4. Add styles in `src/web/css/styles.css` if needed

### Updating WASM Version

1. Make changes to `src/DartLangModTool-master/web/main.dart`

2. Rebuild:
   ```bash
   mise run build:web
   ```

3. Test locally:
   ```bash
   mise run serve:web
   ```

4. Deploy via GitHub Actions

### Adding Build Tasks

Edit `src/mise.toml`:

```toml
[tasks.my-task]
description = "Description of what it does"
run = '''
#!/usr/bin/env bash
set -euo pipefail

echo "Running my task..."
# Task commands here
'''
```

## Getting Help

- **Issues**: https://github.com/keristero/mod-tool-keristerified/issues
- **Discussions**: https://github.com/keristero/mod-tool-keristerified/discussions
- **OpenSpec Docs**: See `openspec/` directory

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the ONB community guidelines

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ONB community use).

Thank you for contributing! 🎉
