# Version Directory

This directory contains versioned WASM builds of the ONB Mod Analyzer.

## Structure

Each version is stored in its own subdirectory:

```
versions/
├── index.json          # Version manifest
├── latest/             # Symlink or copy of latest version
│   ├── onb_mod_file.wasm
│   ├── onb_mod_file.mjs
│   └── metadata.json
├── v1.0.0/            # Specific version
│   ├── onb_mod_file.wasm
│   ├── onb_mod_file.mjs
│   └── metadata.json
└── v1.1.0/            # Another version
    ├── onb_mod_file.wasm
    ├── onb_mod_file.mjs
    └── metadata.json
```

## Building New Versions

To build and deploy a new version:

1. Update the version number in the appropriate files
2. Run `mise run build:web` to build the WASM module
3. The artifacts will be placed in `versions/latest/`
4. For release, copy to a versioned directory: `cp -r latest/ v1.2.0/`
5. Update `index.json` to include the new version

## Version Metadata

Each version includes a `metadata.json` file with:
- Version number
- Build date
- Dart version used
- List of features
- Known issues (if any)

This metadata is displayed in the web interface version selector.
