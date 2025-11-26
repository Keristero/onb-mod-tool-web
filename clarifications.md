1. steps.md had some incorrect details:
    1. the XML export feature described should actually be a CSV export.

1. the github workflow should also rely on mise tasks to set up its runner and to build the wasm

1. we should not copy the latest build to src/web/versions/latest/, the buld should have a version number option so that both the workflow and users can specify a version number, the website will auto discover the latest folder.

1. if it simplifies things, its okay to reset the website when we change versions of the mod_tool, the mod tool version could be extra url params, we could also encode the currently selected settings in the URL params for sharing links with others