// File Browser Tab - Displays mod file structure and contents

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { FilePreviewMixin } from './file-preview-mixin.mjs';
import { IssueManager } from './issue-manager.mjs';
import { escapeHtml } from '../utils/html-utils.mjs';
import { toggleClass } from '../utils/dom-helpers.mjs';
import { LuaGlobalsHighlighter, loadVersionMetadata } from '../utils/lua-globals.mjs';

export default class FileBrowserTab extends BaseTab {
    constructor() {
        super();
        Object.assign(this, FilePreviewMixin);
        this.selectedFile = null;
        this.issueManager = new IssueManager();
        this.warningsByFile = new Map(); // Add support for warnings
        this.luaGlobalsHighlighter = null;
        this.metadata = null;
        this.currentVersion = null;
    }
    
    async init(container) {
        await super.init(container);
        // Don't load metadata here - main app will call setVersion with correct version
        
        this.container.innerHTML = `
            <div class="file-browser">
                <div class="file-tree-container">
                    <h3>Files</h3>
                    <div class="file-tree-scroll-wrapper">
                        <div id="file-tree" class="file-tree"></div>
                    </div>
                </div>
                <div class="resize-handle"></div>
                <div class="file-preview-container">
                    <div class="preview-header">
                        <h3 id="preview-filename">Select a file</h3>
                        <button class="btn btn-download" data-action="download-file" style="display: none;" title="Download file">⬇</button>
                    </div>
                    <div class="file-preview-scroll-wrapper">
                        <div id="file-preview" class="file-preview"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupResizer();
    }
    
    /**
     * Load metadata for the specified analyzer version
     */
    async loadMetadata(version = 'latest') {
        try {
            this.metadata = await loadVersionMetadata(version);
            if (this.metadata.lua) {
                console.log('Loaded Lua metadata for version', version, ':', this.metadata.lua);
                this.luaGlobalsHighlighter = new LuaGlobalsHighlighter(this.metadata);
                console.log('Lua globals highlighter initialized');
            }
        } catch (error) {
            console.warn('Failed to initialize Lua globals highlighter:', error);
        }
    }
    
    /**
     * Set the analyzer version and reload metadata
     */
    async setVersion(version) {
        this.currentVersion = version;
        await this.loadMetadata(version);
        
        // Re-render current file if one is selected
        if (this.selectedFile && this.currentMod) {
            await this.showFilePreview(this.currentMod, this.selectedFile);
        }
    }
    
    async onFileProcessed(mod) {
        await super.onFileProcessed(mod);
        
        // Use pre-parsed errors and warnings from mod object
        if (mod.errorsByFile) {
            this.issueManager.errorsByFile = new Map(mod.errorsByFile);
            this.issueManager.rawStderr = mod.result?.stderr || '';
        }
        
        // Populate warnings by file from errorCategories
        this.warningsByFile.clear();
        const warnings = mod.errorCategories?.warnings || [];
        warnings.forEach(warn => {
            const file = warn.file || 'entry.lua';
            if (!this.warningsByFile.has(file)) {
                this.warningsByFile.set(file, []);
            }
            this.warningsByFile.get(file).push(warn);
        });
        
        // Clear previous file selection
        this.selectedFile = null;
        
        // Clear preview
        const headerEl = this.querySelector('#preview-filename');
        if (headerEl) headerEl.textContent = 'Select a file';
        this.setHTML('#file-preview', '');
    }
    
    setCurrentMod(mod) {
        super.setCurrentMod(mod);
        
        // Use pre-parsed errors and warnings from mod object
        if (mod?.errorsByFile) {
            this.issueManager.errorsByFile = new Map(mod.errorsByFile);
            this.issueManager.rawStderr = mod.result?.stderr || '';
        }
        
        // Populate warnings by file from errorCategories
        this.warningsByFile.clear();
        const warnings = mod.errorCategories?.warnings || [];
        warnings.forEach(warn => {
            const file = warn.file || 'entry.lua';
            if (!this.warningsByFile.has(file)) {
                this.warningsByFile.set(file, []);
            }
            this.warningsByFile.get(file).push(warn);
        });
        
        // Clear previous file selection
        this.selectedFile = null;
        
        // Clear preview
        const headerEl = this.querySelector('#preview-filename');
        if (headerEl) headerEl.textContent = 'Select a file';
        this.setHTML('#file-preview', '');
    }
    
    onShow() {
        // Called when tab becomes visible - render immediately
        if (this.needsRender) {
            this.render();
            this.needsRender = false;
        }
    }
    
    render() {
        if (!this.currentMod || !this.zipArchive) {
            this.setHTML('#file-tree', '<div class="empty-state">No files available</div>');
            this.setHTML('#file-preview', '');
            return;
        }
        
        this.renderFileTree();
    }
    
    renderFileTree() {
        const tree = this.buildFileTree();
        const html = this.renderTreeNode(tree);
        this.setHTML('#file-tree', html);
        
        // Add click handlers
        this.addEventListeners('.file-tree-item[data-path]', 'click', (e) => {
            this.selectFile(e.target.dataset.path);
        });
        
        // Add folder toggle handlers
        this.addEventListeners('.folder-header', 'click', (e) => {
            const folderHeader = e.target.closest('.folder-header');
            if (!folderHeader) return;
            
            const folder = folderHeader.parentElement;
            const childrenDiv = folder.querySelector('.folder-children');
            const icon = folderHeader.querySelector('.folder-icon');
            
            if (childrenDiv) {
                const isCollapsed = childrenDiv.style.display === 'none';
                childrenDiv.style.display = isCollapsed ? '' : 'none';
                if (icon) {
                    icon.textContent = isCollapsed ? '📁' : '📂';
                }
            }
        });
        
        // Auto-select entry.lua if no file is currently selected
        if (!this.selectedFile && this.zipArchive && this.zipArchive.files['entry.lua']) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                this.selectFile('entry.lua');
            }, 0);
        }
    }
    
    buildFileTree() {
        const tree = { name: 'root', children: {}, type: 'folder' };
        
        Object.keys(this.zipArchive.files).forEach(path => {
            const parts = path.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (!part) return; // Skip empty parts
                
                if (index === parts.length - 1 && !path.endsWith('/')) {
                    // It's a file
                    current.children[part] = {
                        name: part,
                        path: path,
                        type: 'file'
                    };
                } else {
                    // It's a folder
                    if (!current.children[part]) {
                        current.children[part] = {
                            name: part,
                            children: {},
                            type: 'folder'
                        };
                    }
                    current = current.children[part];
                }
            });
        });
        
        return tree;
    }
    
    renderTreeNode(node, level = 0) {
        if (node.type === 'file') {
            const icon = this.getFileIcon(node.name);
            return `
                <div class="file-tree-item" data-path="${node.path}" style="padding-left: ${level * 10}px" title="${node.path}">
                    ${icon} ${node.name}
                </div>
            `;
        }
        
        const children = Object.values(node.children);
        if (children.length === 0) return '';
        
        const childrenHtml = children.map(child => this.renderTreeNode(child, level + 1)).join('');
        
        if (level === 0) {
            return childrenHtml;
        }
        
        return `
            <div class="file-tree-folder" style="padding-left: ${level * 10}px">
                <div class="folder-header" data-folder="${node.name}">
                    <span class="folder-icon">📁</span> ${node.name}
                </div>
                <div class="folder-children">${childrenHtml}</div>
            </div>
        `;
    }
    

    
    async selectFile(path) {
        this.selectedFile = path;
        
        // Update active state
        this.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === path);
        });
        
        // Update header
        const filename = path.split('/').pop();
        const headerEl = this.querySelector('#preview-filename');
        if (headerEl) headerEl.textContent = filename;
        
        // Show and setup download button
        const downloadBtn = this.container.querySelector('[data-action="download-file"]');
        if (downloadBtn) {
            downloadBtn.style.display = 'block';
            // Remove old listener if exists
            const newBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
            // Add new listener
            newBtn.addEventListener('click', () => this.downloadFile());
        }
        
        // Load and display file
        const file = this.zipArchive.files[path];
        if (!file) return;
        
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
            await this.displayImage(file);
        } else if (['lua', 'txt', 'md', 'json', 'xml', 'animation'].includes(ext)) {
            await this.displayText(file, ext);
        } else if (['ogg', 'wav', 'mp3'].includes(ext)) {
            await this.displayAudio(file, filename);
        } else {
            this.displayBinary(file);
        }
    }
    
    async displayImage(file) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        
        this.setHTML('#file-preview', `
            <div class="image-preview">
                <img src="${url}" alt="Preview" style="max-width: 100%; height: auto;" />
            </div>
        `);
    }
    
    async displayAudio(file, filename) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        const ext = filename.split('.').pop().toLowerCase();
        
        this.setHTML('#file-preview', `
            <div class="audio-preview">
                <audio controls style="width: 100%;">
                    <source src="${url}" type="audio/${ext}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `);
        
        // Set volume to 50%
        const audioElement = this.querySelector('audio');
        if (audioElement) {
            audioElement.volume = 0.5;
        }
    }
    
    async displayText(file, ext) {
        const content = await file.async('string');
        const errors = this.getErrorsForFile(this.selectedFile);
        const warnings = this.getWarningsForFile(this.selectedFile);
        
        // Build error summary section
        let errorSummaryHtml = '';
        if (errors.length > 0) {
            const errorItems = errors.map(e => {
                const location = (e.line !== null && e.column !== null) 
                    ? `<span class="error-location">[${e.line}:${e.column}]</span>` 
                    : '';
                return `<div class="error-item">
                    ${location}
                    <span class="error-message">${escapeHtml(e.message)}</span>
                </div>`;
            }).join('');
            
            errorSummaryHtml = `
                <div class="error-summary">
                    <div class="error-summary-header">❌ ${errors.length} error${errors.length > 1 ? 's' : ''} in this file:</div>
                    <div class="error-summary-list">${errorItems}</div>
                </div>
            `;
        }
        
        // Build warning summary section
        let warningSummaryHtml = '';
        if (warnings.length > 0) {
            const warningItems = warnings.map(w => {
                const location = (w.line !== null && w.column !== null) 
                    ? `<span class="warning-location">[${w.line}:${w.column}]</span>` 
                    : '';
                return `<div class="warning-item">
                    ${location}
                    <span class="warning-message">${escapeHtml(w.message)}</span>
                </div>`;
            }).join('');
            
            warningSummaryHtml = `
                <div class="warning-summary">
                    <div class="warning-summary-header">⚠️ ${warnings.length} warning${warnings.length > 1 ? 's' : ''} in this file:</div>
                    <div class="warning-summary-list">${warningItems}</div>
                </div>
            `;
        }
        
        const lines = content.split('\n');
        const lineNumbersHtml = lines.map((_, i) => 
            `<div class="line-number">${i + 1}</div>`
        ).join('');
        
        let linesHtml = lines.map((line, index) => {
            const lineNum = index + 1;
            const lineErrors = errors.filter(e => e.line === lineNum);
            const lineWarnings = warnings.filter(w => w.line === lineNum);
            const hasError = lineErrors.length > 0;
            const hasWarning = lineWarnings.length > 0;
            const lineClasses = [
                hasError ? 'error-line' : '',
                hasWarning ? 'warning-line' : ''
            ].filter(c => c).join(' ');
            
            // Apply syntax highlighting first
            let highlightedLine = this.syntaxHighlight(line, ext, this.metadata);
            
            // Then add column markers for each error on this line
            if (hasError) {
                highlightedLine = this.highlightErrorColumns(line, highlightedLine, lineErrors, 'error');
            }
            
            // Then add column markers for each warning on this line
            if (hasWarning) {
                highlightedLine = this.highlightErrorColumns(line, highlightedLine, lineWarnings, 'warning');
            }
            
            return `<div class="code-line ${lineClasses}" data-line="${lineNum}">${highlightedLine}</div>`;
        }).join('');
        
        this.setHTML('#file-preview', `
            ${errorSummaryHtml}
            ${warningSummaryHtml}
            <div class="code-preview">
                <div class="line-numbers">${lineNumbersHtml}</div>
                <div class="code-content">${linesHtml}</div>
            </div>
        `);
        
        // Enhance Lua syntax highlighting with ONB globals
        if (ext === 'lua' && this.luaGlobalsHighlighter) {
            const codeLines = this.querySelectorAll('.code-line');
            codeLines.forEach(line => {
                this.luaGlobalsHighlighter.enhanceHighlighting(line);
            });
        }
        
        // Add error tooltips
        if (errors.length > 0) {
            this.addErrorTooltips(errors);
        }

        // Add warning tooltips
        if (warnings.length > 0) {
            this.addWarningTooltips(warnings);
        }
    }
    
    /**
     * Highlight specific error column positions in a syntax-highlighted line
     * @param {string} originalLine - The original unescaped line
     * @param {string} highlightedLine - The syntax-highlighted HTML line
     * @param {Array} errors - Array of errors for this line
     * @returns {string} Line with error column markers
     */
    highlightErrorColumns(originalLine, highlightedLine, errors, type = 'error') {
        // Sort errors by column (descending) to insert markers from right to left
        const sortedErrors = [...errors].sort((a, b) => b.column - a.column);
        
        // For each error, we need to find the character position in the HTML
        // This is tricky because the HTML has syntax highlighting tags
        
        // Strategy: Insert an invisible marker at the column position
        // We'll do this by finding the nth visible character in the HTML
        
        let result = highlightedLine;
        const markerClass = type === 'warning' ? 'warning-column-marker' : 'error-column-marker';
        
        for (const error of sortedErrors) {
            const col = error.column - 1; // Convert to 0-based
            
            // Count visible characters in the original line
            if (col < 0 || col >= originalLine.length) continue;
            
            // Find the position in HTML that corresponds to this column
            const htmlPosition = this.findHtmlPositionForColumn(highlightedLine, col);
            
            if (htmlPosition !== -1) {
                // Insert error/warning marker
                result = result.slice(0, htmlPosition) + 
                        `<span class="${markerClass}"></span>` + 
                        result.slice(htmlPosition);
            }
        }
        
        return result;
    }
    
    /**
     * Find the HTML position that corresponds to a specific column in the original text
     * @param {string} html - The HTML string with syntax highlighting
     * @param {number} targetColumn - The column position (0-based)
     * @returns {Object} {start, end} positions in HTML string for the character
     */
    findHtmlPositionForColumn(html, targetColumn) {
        let visibleChars = 0;
        let inTag = false;
        
        for (let i = 0; i < html.length; i++) {
            const char = html[i];
            
            if (char === '<') {
                inTag = true;
            } else if (char === '>') {
                inTag = false;
            } else if (!inTag) {
                // This is a visible character
                if (visibleChars === targetColumn) {
                    // Find the end of this character (next tag or next character)
                    let end = i + 1;
                    // Handle HTML entities like &lt; &gt; &amp;
                    if (char === '&') {
                        while (end < html.length && html[end] !== ';') {
                            end++;
                        }
                        if (end < html.length) end++; // Include the semicolon
                    }
                    return { start: i, end: end };
                }
                visibleChars++;
            }
        }
        
        return { start: -1, end: -1 };
    }
    

    
    displayBinary(file) {
        this.setHTML('#file-preview', `
            <div class="binary-preview">
                <p>Binary file (${file._data.uncompressedSize} bytes)</p>
            </div>
        `);
    }
    
    getErrorsForFile(path) {
        // Use IssueManager for centralized issue retrieval
        // Pass the full path to support proper path matching
        if (!path) return [];
        return this.issueManager.getErrorsForFile(path);
    }
    
    getWarningsForFile(path) {
        // Get warnings for a specific file
        if (!path) return [];
        
        // Try exact match first
        if (this.warningsByFile.has(path)) {
            return this.warningsByFile.get(path);
        }
        
        // Try partial match (last component of path)
        const fileName = path.split('/').pop();
        for (const [file, warnings] of this.warningsByFile.entries()) {
            if (file.endsWith(fileName) || file.endsWith(path)) {
                return warnings;
            }
        }
        
        return [];
    }
    
    addErrorTooltips(errors) {
        errors.forEach(error => {
            const line = this.container.querySelector(`.code-line[data-line="${error.line}"]`);
            if (line) {
                line.title = error.message;
                line.style.cursor = 'help';
            }
        });
    }

    addWarningTooltips(warnings) {
        warnings.forEach(warning => {
            const line = this.container.querySelector(`.code-line[data-line="${warning.line}"]`);
            if (line) {
                line.title = warning.message;
                line.style.cursor = 'help';
            }
        });
    }

    async downloadFile() {
        if (!this.selectedFile || !this.zipArchive) return;
        
        const file = this.zipArchive.files[this.selectedFile];
        if (!file) return;
        
        try {
            const blob = await file.async('blob');
            const url = URL.createObjectURL(blob);
            const fileName = this.selectedFile.split('/').pop();
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    }

    
    clear() {
        super.clear();
        this.selectedFile = null;
        this.issueManager.parseErrors(''); // Clear issues
        
        if (this.container) {
            this.setHTML('#file-tree', '<div class="empty-state">No files</div>');
            this.setHTML('#file-preview', '');
            
            // Hide download button
            const downloadBtn = this.container.querySelector('[data-action="download-file"]');
            if (downloadBtn) {
                downloadBtn.style.display = 'none';
            }
        }
    }
    
    setupResizer() {
        const resizeHandle = this.container.querySelector('.resize-handle');
        const fileTreeContainer = this.container.querySelector('.file-tree-container');
        const fileBrowser = this.container.querySelector('.file-browser');
        
        if (!resizeHandle || !fileTreeContainer || !fileBrowser) return;
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = fileTreeContainer.offsetWidth;
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const delta = e.clientX - startX;
            const newWidth = Math.max(150, Math.min(600, startWidth + delta));
            
            fileBrowser.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
}
