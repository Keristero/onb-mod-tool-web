1. when new file is uploaded, it we should automatically select it after it is parsed.

1. right now the dependency graph and the file browser are not updating correctly when we select a new mod,
a. in the file browser the previous file preview is still displayed.
b. in the dependency view, the old nodes are not removed from the state - so it just becomes more and more populated (this will be useful for a summary view of all dependenies later but right now we just want to see the dependencies + includes for the one selected mod.)

1. the file browser file list is too indented, files are overflowing the div to the right, lets make it a more compact view, also the file preview is often overflowing the right edge of the div, we should make the entire webpage able to scale to fill 100% of the horizontal layout if we resize the browser., we should also use most of the vertical layout.


1. currently the statistics tab has broad statistics for all files, and dependencies is currently limited to the selected file (or it should be). I'd like to have a per file, and per session statistics and dependenices tab.
2. the per file tabs should only show statistics and dependencies for the currently selected mod
3. the per session tabs should have their stats reset on page load, and they should show information regarding all mods that have been parsed.

1. The processed mods list should highlight mods in different colors based on if they had any errors during parsing.

1. the results tab summary items should each have a computation and validation function that determines what they display. this will tidy up the code and allow us to set the border color of each cell based on if we think the current value is valid or not. for example ID should contain the uuid of the mod, but if that is not found it should be highlighted red.

If the values are good, for example if Errors: 0, then we should give them a green border.
