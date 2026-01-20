# ONB Mod Tool

Browser-based WebAssembly analyzer for Open Net Battle mod files.

## Usage

**Web Interface:**

Visit: [https://keristero.github.io/onb-mod-tool-web/](https://keristero.github.io/onb-mod-tool-web/)

1. Upload a mod zip
1. You will see the new mod manifest json as well as any errors or warnings encountered while parsing the mod.
1. You can upload many mods and view insightful statistics in the statistics tab.

**Local Development:**

```bash
cd src
mise run setup      # Install dependencies
mise run build:all  # Build everything
mise run serve:web  # Start local server
```

## Credits

The core tool is developed by the one and only [TheMaverickProgrammer](https://github.com/TheMaverickProgrammer)
The tool is not publicly available code, but I have been granted permission to use it in this project.
