## Context

The mod analyzer already loads and caches zip archives via JSZip for every processed mod (used by file browser, statistics, and dependency tabs). Each mod's `fileData` ArrayBuffer and extracted archive are available in memory. The tab system follows a consistent `BaseTab` lifecycle (`init`, `onFileProcessed`, `setCurrentMod`, `render`, `clear`) and subtab pattern (current-file / session).

The search feature must scan text files inside potentially 2000+ zips, each with ~5–20 files, without freezing the UI. All data is already client-side; no server round-trips are needed.

## Goals / Non-Goals

**Goals:**
- Provide fast, responsive full-text search across mod zip contents.
- Stream results progressively so users see matches as they're found.
- Follow existing tab/subtab patterns for consistency.
- Keep the UI responsive during large searches (2000+ mods).

**Non-Goals:**
- Regex or glob pattern matching (plain string search only for v1).
- Indexing or pre-processing file contents (search is on-demand).
- Searching binary files (images, audio, etc.).
- Web Worker–based search (zip data is already on the main thread; transferring it to a worker would be more expensive than yielding).

## Decisions

### 1. Main-thread search with batched yielding

**Decision:** Run the search loop on the main thread, yielding to the event loop every N files via `setTimeout(0)` / `requestIdleCallback` so the UI stays responsive.

**Alternatives considered:**
- **Web Worker:** Zip ArrayBuffers would need to be transferred or cloned to the worker, doubling memory or requiring structured-clone overhead per mod. Since the data already lives on the main thread (cached by JSZip), in-place scanning with yielding is simpler and avoids memory pressure.
- **SharedArrayBuffer:** Requires COOP/COEP headers which complicate static GitHub Pages hosting.

### 2. Reuse cached JSZip archives

**Decision:** Access `mod.archive` (the JSZip instance cached during `onFileProcessed`) to read file contents. Extract text via `zip.file(name).async('string')` on demand during search.

**Rationale:** Avoids redundant extraction. The file browser tab already proves this cache is reliable. For mods not yet loaded (archive not cached), lazily load the archive from `mod.fileData` before searching.

### 3. Text-file filtering

**Decision:** Only search files whose names match known text extensions (`.lua`, `.toml`, `.txt`, `.json`, `.xml`, `.md`, `.cfg`, `.ini`, `.csv`, `.tsv`) or have no extension. Skip binary files (images, audio, `.wasm`, etc.).

**Rationale:** Searching binary content produces garbage matches and wastes time.

### 4. Case-insensitive search by default

**Decision:** Convert both search query and file contents to lowercase for comparison. This matches user expectations from GitHub/VS Code.

### 5. Streaming result rendering

**Decision:** Append result groups to the DOM as each mod finishes scanning rather than waiting for all mods. Use a `DocumentFragment` per mod group to minimize reflows.

**Rationale:** Users see early results immediately, especially important when scanning 2000+ mods. A progress counter updates in the summary bar.

### 6. Cancellation support

**Decision:** Each search is assigned a generation counter. Starting a new search increments the counter, causing the previous search's yield loop to abort on the next iteration.

**Rationale:** Users may refine queries mid-search. Without cancellation, stale results would continue streaming in.

## Risks / Trade-offs

- **Memory:** Extracting file text content on-the-fly adds transient memory pressure. → Mitigated by processing one file at a time and not caching the extracted text (only the match lines).
- **Large files:** A single very large Lua file could block during string search. → Mitigated by the yield cadence (every N files). Individual file search is fast for typical mod files (<100KB).
- **No highlighting in binary:** Users may expect to search `.png` filenames etc. → The search targets file *contents*, not file *names*. Filename search could be a follow-up.
