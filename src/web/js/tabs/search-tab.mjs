// Search Tab - Full-text search across mod zip file contents

import BaseTab from './base-tab.mjs';
import { escapeHtml } from '../utils/html-utils.mjs';

const TEXT_EXTENSIONS = new Set([
    '.lua', '.toml', '.txt', '.json', '.xml', '.md',
    '.cfg', '.ini', '.csv', '.tsv'
]);

const YIELD_BATCH_SIZE = 20; // files before yielding to event loop

function isTextFile(filename) {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) return true; // no extension = treat as text
    const ext = filename.slice(dotIndex).toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
}

function yieldToEventLoop() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

export default class SearchTab extends BaseTab {
    constructor(app) {
        super();
        this.app = app;
        this.sessionMods = [];
        this.searchGeneration = 0;
        this.fileContainer = null;
        this.sessionContainer = null;
    }

    async init(container) {
        this.container = container;

        this.fileContainer = document.querySelector('#sub-tab-search-file .tab-panel');
        this.sessionContainer = document.querySelector('#sub-tab-search-session .tab-panel');

        const buildUI = (el, id) => {
            el.innerHTML = `
                <div class="search-bar">
                    <input type="text" id="${id}-input" placeholder="Search file contents...">
                    <label class="search-option" title="Use regular expression">
                        <input type="checkbox" id="${id}-regex"> Regex
                    </label>
                    <button id="${id}-btn">Search</button>
                    <button id="${id}-cancel" class="search-cancel-btn" style="display:none;">Cancel</button>
                </div>
                <div class="search-summary" id="${id}-summary" style="display:none;"></div>
                <div class="search-results" id="${id}-results"></div>
                <div class="search-message" id="${id}-message"></div>
            `;
        };

        buildUI(this.fileContainer, 'search-file');
        buildUI(this.sessionContainer, 'search-session');

        // Wire events for file subtab
        const fileInput = this.fileContainer.querySelector('#search-file-input');
        const fileBtn = this.fileContainer.querySelector('#search-file-btn');
        const fileCancelBtn = this.fileContainer.querySelector('#search-file-cancel');
        fileBtn.addEventListener('click', () => this.runSearch('file'));
        fileInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.runSearch('file');
        });
        fileCancelBtn.addEventListener('click', () => this.cancelSearch('file'));

        // Wire events for session subtab
        const sessionInput = this.sessionContainer.querySelector('#search-session-input');
        const sessionBtn = this.sessionContainer.querySelector('#search-session-btn');
        const sessionCancelBtn = this.sessionContainer.querySelector('#search-session-cancel');
        sessionBtn.addEventListener('click', () => this.runSearch('session'));
        sessionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.runSearch('session');
        });
        sessionCancelBtn.addEventListener('click', () => this.cancelSearch('session'));
    }

    async onFileProcessed(mod) {
        this.currentMod = mod;
        const existing = this.sessionMods.find(m => m.id === mod.id);
        if (!existing) {
            this.sessionMods.unshift(mod);
        } else {
            Object.assign(existing, mod);
        }
        this.needsRender = true;
    }

    setCurrentMod(mod) {
        this.currentMod = mod;
        this.needsRender = true;
    }

    onShow() {
        // Nothing to re-render on show; search is user-initiated
    }

    render() {
        // Search is triggered by user input, not by render cycle
    }

    cancelSearch(mode) {
        this.searchGeneration++;
        const prefix = mode === 'file' ? 'search-file' : 'search-session';
        const cancelBtn = document.getElementById(`${prefix}-cancel`);
        const summaryEl = document.getElementById(`${prefix}-summary`);
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (summaryEl && summaryEl.textContent.startsWith('Searching')) {
            summaryEl.textContent = summaryEl.textContent.replace('Searching...', 'Cancelled —');
        }
    }

    clear() {
        this.currentMod = null;
        this.sessionMods = [];
        this.searchGeneration++;
        for (const id of ['search-file', 'search-session']) {
            const results = document.getElementById(`${id}-results`);
            const summary = document.getElementById(`${id}-summary`);
            const message = document.getElementById(`${id}-message`);
            const cancelBtn = document.getElementById(`${id}-cancel`);
            if (results) results.innerHTML = '';
            if (summary) { summary.style.display = 'none'; summary.textContent = ''; }
            if (message) message.textContent = '';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }
    }

    async runSearch(mode) {
        const prefix = mode === 'file' ? 'search-file' : 'search-session';
        const input = document.getElementById(`${prefix}-input`);
        const regexCheckbox = document.getElementById(`${prefix}-regex`);
        const resultsEl = document.getElementById(`${prefix}-results`);
        const summaryEl = document.getElementById(`${prefix}-summary`);
        const messageEl = document.getElementById(`${prefix}-message`);
        const cancelBtn = document.getElementById(`${prefix}-cancel`);

        const query = input.value.trim();
        if (!query) return;

        const useRegex = regexCheckbox.checked;

        // Build the matcher
        let regex;
        if (useRegex) {
            try {
                regex = new RegExp(query, 'gi');
            } catch (e) {
                messageEl.textContent = `Invalid regex: ${e.message}`;
                return;
            }
        } else {
            regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }

        // Cancel any previous search
        const generation = ++this.searchGeneration;

        // Clear previous results
        resultsEl.innerHTML = '';
        messageEl.textContent = '';
        summaryEl.style.display = 'block';
        summaryEl.textContent = 'Searching...';
        cancelBtn.style.display = '';

        // Determine mods to search
        let mods;
        if (mode === 'file') {
            if (!this.currentMod) {
                messageEl.textContent = 'No mod selected.';
                summaryEl.style.display = 'none';
                return;
            }
            mods = [this.currentMod];
        } else {
            mods = this.sessionMods;
            if (mods.length === 0) {
                messageEl.textContent = 'No mods loaded in session.';
                summaryEl.style.display = 'none';
                return;
            }
        }

        let totalFiles = 0;
        let totalMatches = 0;
        let modsWithMatches = 0;

        for (const mod of mods) {
            if (this.searchGeneration !== generation) return; // cancelled

            const archive = await this.ensureArchive(mod);
            if (!archive) continue;

            let modMatches = 0;
            const fileResults = [];
            const files = [];
            archive.forEach((path, entry) => {
                if (!entry.dir && isTextFile(path)) {
                    files.push({ path, entry });
                }
            });

            for (let i = 0; i < files.length; i++) {
                if (this.searchGeneration !== generation) return; // cancelled

                const { path, entry } = files[i];
                totalFiles++;

                try {
                    const content = await entry.async('string');
                    const lines = content.split('\n');
                    const matches = [];

                    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                        regex.lastIndex = 0;
                        if (regex.test(lines[lineIdx])) {
                            matches.push(lineIdx);
                        }
                    }

                    if (matches.length > 0) {
                        modMatches += matches.length;
                        fileResults.push({ path, lines, matches });
                    }
                } catch (e) {
                    // skip files that can't be read as text
                }

                // Yield periodically
                if ((i + 1) % YIELD_BATCH_SIZE === 0) {
                    summaryEl.textContent = `Searching... ${totalFiles} files scanned`;
                    await yieldToEventLoop();
                    if (this.searchGeneration !== generation) return;
                }
            }

            // Append results for this mod
            if (fileResults.length > 0) {
                modsWithMatches++;
                totalMatches += modMatches;
                const fragment = this.buildModGroup(mod, fileResults, regex);
                resultsEl.appendChild(fragment);
            }

            // Update summary progressively
            summaryEl.textContent = `Searched ${totalFiles} files, found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} across ${modsWithMatches} mod${modsWithMatches !== 1 ? 's' : ''}`;
        }

        if (this.searchGeneration !== generation) return;

        cancelBtn.style.display = 'none';

        if (totalMatches === 0) {
            messageEl.textContent = `No matches found for "${query}".`;
        }

        summaryEl.textContent = `Searched ${totalFiles} files, found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} across ${modsWithMatches} mod${modsWithMatches !== 1 ? 's' : ''}`;
    }

    async ensureArchive(mod) {
        if (mod.zipArchive) return mod.zipArchive;
        if (!mod.fileData) return null;
        try {
            mod.zipArchive = await JSZip.loadAsync(mod.fileData);
            return mod.zipArchive;
        } catch (e) {
            return null;
        }
    }

    buildModGroup(mod, fileResults, regex) {
        const fragment = document.createDocumentFragment();
        const group = document.createElement('div');
        group.className = 'search-mod-group';

        const totalMatches = fileResults.reduce((sum, f) => sum + f.matches.length, 0);

        const header = document.createElement('div');
        header.className = 'search-mod-header';
        header.innerHTML = `
            <span>${escapeHtml(mod.fileName)}</span>
            <span class="match-count">${totalMatches} match${totalMatches !== 1 ? 'es' : ''}</span>
        `;
        header.addEventListener('click', () => {
            const idx = this.app.processedMods.indexOf(mod);
            if (idx !== -1) this.app.selectMod(idx);
        });
        group.appendChild(header);

        for (const file of fileResults) {
            const fileGroup = document.createElement('div');
            fileGroup.className = 'search-file-group';

            const fileName = document.createElement('div');
            fileName.className = 'search-file-name';
            fileName.textContent = file.path;
            fileGroup.appendChild(fileName);

            for (const matchIdx of file.matches) {
                const block = document.createElement('div');
                block.className = 'search-context-block';

                const start = Math.max(0, matchIdx - 1);
                const end = Math.min(file.lines.length - 1, matchIdx + 1);

                for (let i = start; i <= end; i++) {
                    const line = document.createElement('div');
                    line.className = 'search-line' + (i === matchIdx ? ' match' : '');
                    const lineNum = document.createElement('span');
                    lineNum.className = 'search-line-number';
                    lineNum.textContent = i + 1;
                    const lineContent = document.createElement('span');
                    lineContent.className = 'search-line-content';

                    if (i === matchIdx) {
                        lineContent.innerHTML = this.highlightMatches(file.lines[i], regex);
                    } else {
                        lineContent.textContent = file.lines[i];
                    }

                    line.appendChild(lineNum);
                    line.appendChild(lineContent);
                    block.appendChild(line);
                }

                fileGroup.appendChild(block);
            }

            group.appendChild(fileGroup);
        }

        fragment.appendChild(group);
        return fragment;
    }

    highlightMatches(line, regex) {
        const result = [];
        let lastIndex = 0;
        regex.lastIndex = 0;
        let match;

        while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                result.push(escapeHtml(line.slice(lastIndex, match.index)));
            }
            result.push(`<span class="search-highlight">${escapeHtml(match[0])}</span>`);
            lastIndex = match.index + match[0].length;
            if (match[0].length === 0) {
                regex.lastIndex++; // avoid infinite loop on zero-length matches
            }
        }

        if (lastIndex < line.length) {
            result.push(escapeHtml(line.slice(lastIndex)));
        }

        return result.join('');
    }
}
