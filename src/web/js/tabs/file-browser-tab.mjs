// File Browser Tab - Displays mod file structure and contents

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { FilePreviewMixin } from './file-preview-mixin.mjs';
import { ErrorManager } from './error-manager.mjs';

export default class FileBrowserTab extends BaseTab {
    constructor() {
        super();
        Object.assign(this, FilePreviewMixin);
        this.selectedFile = null;
        this.errorManager = new ErrorManager();
    }
    
    async init(container) {
        await super.init(container);
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
                    <h3 id="preview-filename">Select a file</h3>
                    <div class="file-preview-scroll-wrapper">
                        <div id="file-preview" class="file-preview"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupResizer();
    }
    
    async onFileProcessed(mod) {
        await super.onFileProcessed(mod);
        
        // Clear previous errors
        this.errorManager.errorsByFile.clear();
        this.errorManager.rawStderr = '';
        
        // Parse errors for this mod
        if (mod.result?.stderr) {
            this.errorManager.parseErrors(mod.result.stderr);
        }
        
        // Clear previous file selection
        this.selectedFile = null;
        
        // Clear preview
        const headerEl = this.querySelector('#preview-filename');
        if (headerEl) headerEl.textContent = 'Select a file';
        this.setHTML('#file-preview', '');
        
        // Auto-select entry.lua if it exists in the root
        if (this.zipArchive && this.zipArchive.files['entry.lua']) {
            // Wait for render to complete, then select
            setTimeout(() => {
                this.selectFile('entry.lua');
            }, 100);
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
        
        // Build error summary section
        let errorSummaryHtml = '';
        if (errors.length > 0) {
            const errorItems = errors.map(e => 
                `<div class="error-item">
                    <span class="error-location">[${e.line}:${e.column}]</span>
                    <span class="error-message">${this.escapeHtml(e.message)}</span>
                </div>`
            ).join('');
            
            errorSummaryHtml = `
                <div class="error-summary">
                    <div class="error-summary-header">⚠️ ${errors.length} error${errors.length > 1 ? 's' : ''} in this file:</div>
                    <div class="error-summary-list">${errorItems}</div>
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
            const hasError = lineErrors.length > 0;
            const errorClass = hasError ? 'error-line' : '';
            
            // Apply syntax highlighting first
            let highlightedLine = this.syntaxHighlight(line, ext);
            
            // Then add column markers for each error on this line
            if (hasError) {
                highlightedLine = this.highlightErrorColumns(line, highlightedLine, lineErrors);
            }
            
            return `<div class="code-line ${errorClass}" data-line="${lineNum}">${highlightedLine}</div>`;
        }).join('');
        
        this.setHTML('#file-preview', `
            ${errorSummaryHtml}
            <div class="code-preview">
                <div class="line-numbers">${lineNumbersHtml}</div>
                <div class="code-content">${linesHtml}</div>
            </div>
        `);
        
        // Add error tooltips
        if (errors.length > 0) {
            this.addErrorTooltips(errors);
        }
    }
    
    /**
     * Highlight specific error column positions in a syntax-highlighted line
     * @param {string} originalLine - The original unescaped line
     * @param {string} highlightedLine - The syntax-highlighted HTML line
     * @param {Array} errors - Array of errors for this line
     * @returns {string} Line with error column markers
     */
    highlightErrorColumns(originalLine, highlightedLine, errors) {
        // Sort errors by column (descending) to insert markers from right to left
        const sortedErrors = [...errors].sort((a, b) => b.column - a.column);
        
        // For each error, we need to find the character position in the HTML
        // This is tricky because the HTML has syntax highlighting tags
        
        // Strategy: Insert an invisible marker at the column position
        // We'll do this by finding the nth visible character in the HTML
        
        let result = highlightedLine;
        
        for (const error of sortedErrors) {
            const col = error.column - 1; // Convert to 0-based
            
            // Count visible characters in the original line
            if (col < 0 || col >= originalLine.length) continue;
            
            // Find the position in HTML that corresponds to this column
            const htmlPosition = this.findHtmlPositionForColumn(highlightedLine, col);
            
            if (htmlPosition !== -1) {
                // Insert error marker
                result = result.slice(0, htmlPosition) + 
                        '<span class="error-column-marker"></span>' + 
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
                <button class="btn" onclick="this.download()">Download</button>
            </div>
        `);
    }
    
    getErrorsForFile(path) {
        // Use ErrorManager for centralized error retrieval
        if (!path) return [];
        const fileName = path.split('/').pop();
        return this.errorManager.getErrorsForFile(fileName);
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
    

    
    clear() {
        super.clear();
        this.selectedFile = null;
        this.errorManager.parseErrors(''); // Clear errors
        
        if (this.container) {
            this.setHTML('#file-tree', '<div class="empty-state">No files</div>');
            this.setHTML('#file-preview', '');
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
