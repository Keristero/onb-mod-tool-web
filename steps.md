We are building a fully clientside static website for analysing open net battle mod files.
To acomplish this I have created an example website based on an older version of the onb mod tool dart application.
This consists of.

1. The ONB mod tool
    1. in `old-interpreter-and-website/onb_mod_file_share`
    2. CLI application
    3. Takes ONB mod zips as input, as well as some command line options
    4. Outputs all the analysed mod data, originally this was text but in the new version this will be JSON ready for consumption by additional tooling.

2. Nix build system
    1. We have a nix derivation `old-interpreter-and-website/onb_mod_file_share/default.nix` which automates our build process, there is an option to do a native build (for the command line application) or a web assembly build (for integration into a web browser)

3. Website
    1. in `old-interpreter-and-website/mod_tool_web`
    2. The website allows users to upload ONB mod files with a simple interface, it then spawns a web worker which runs the web assembly code to anaylse the mod, after analysis the results are displayed and enriched for detailed investigations into errors and the mods attributes.

Our task is to build a production version of the build system and website that will improve on the original in some key areas.
1. We are using a much newer version of the ONB mod tool in `src/DartLangModTool-master` which has CLI options and JSON output to consider, we will need to find a smart way to add a web assembly ready entry point to this which does not require `dart:io` but also reuses as much existing code as possible. Ideally this should be a single additional file that can be added to the codebase without modifying anything, and that dynamically handles the command line arguments to allow for seamless upgrades without needing to be modified by the maintainers of the original codebase.

2. the build system should be added to `src/` it will consist of a nix derrivation file like the original, but it will live a folder level above the main codebase `DartLangModTool-master` (which will eventually be a git submodule). we should include a simple mise.toml file which uses mise tasks (read docs here https://mise.jdx.dev/tasks/) to:
    1. automate the setup of nix portable (if nix is not already installed or avaialble as nix portable) https://github.com/DavHau/nix-portable
    2. build either the `native` or `web` versions of the application, if the web version is built, the resulting files should be copied into the `/src/web` directory where they are required by the website.
    3. run the native version (we dont need a way to run the web version)

3. the website should be much like the first, with enhancements: 
    1. we should structure it in a clean moduluar way to support future extension.
    2. it needs to support parsing the JSON which will be returned by the new version of the mod tool WASM
    3. it needs to be able to display the JSON in a tidy way for humans to read, similar to JSON preview utilities.
        4. for the file previews, it should be much like before with hover + click for the file browser, but for the files mentioned in the errors we should also highlight all the errors that were mentioned previously in the line:column hovers
    5. it should record statistics for each file parsed, we want to record every data point that we might want to report on.
        6. We should have a report tab which lets us view a dashboard of how many mods were parsed successfully, how many errors we had per file, the most common errors that occured (highest to lowest), and aggregated statistics. there should be a XML export option.
    6. it should support batch processing, with multiple files either drag and dropped or selected from the file browser.
    7. We need to dynamically discover and display the command line options, and handle the STDOUT that may accompany / replace the standard json output.
    8. We should allow for loading of previous versions of the `.js` and `.wasm` file produced from `DartLangModTool-master`, we will default to the latest but there should be an option in case we want to include older versions for comparison
    9. We should have another tab for a dependency graph, if mods require eachother we can render a directed node graph showing the inter mod dependencies based on their package ids.

4. Finally, there will be a manually triggered github workflow which takes a version number, builds a new version of the mod tool wasm, bundles it in a new versioned folder in the web directory (which is dynamically read and used to populate the list of versions on the website), because the website is entirely static, we can then automatically host it using githubs free web hosting service as the final part of this workflow.

Treat `/src/` as the new repository, DartLangModTool-master will eventually be a submodule.

I have spent months coming up with this design this system and vision, it will be your task to implement every last detail described, keep it simple, dont overengineer it, dont write any documentation except a single page readme which explains how to install mise and run the mise tasks which automate everything else. and remember every line of code is a liability so keep it dry.
