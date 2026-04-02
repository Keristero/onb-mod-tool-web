// Results Tab - Displays JSON analysis results

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { FilePreviewMixin } from './file-preview-mixin.mjs';
import { IssueManager, findBestPathMatch } from './issue-manager.mjs';
import { addClass } from '../utils/dom-helpers.mjs';
import { createElement, escapeHtml } from '../utils/html-utils.mjs';

export default class ResultsTab extends BaseTab {
    constructor() {
        super();
        // Mix in file preview functionality
        Object.assign(this, FilePreviewMixin);
        this.issueManager = new IssueManager();
    }
    
    async init(container) {
        await super.init(container);
        this.container.innerHTML = `
            <div class="results-view">
                <div class="results-header">
                    <h2>Analysis Results</h2>
                    <div class="results-actions">
                        <input type="text" id="json-search" class="filter-input" placeholder="Search JSON..." />
                        <button id="copy-json" class="btn btn-secondary">Copy JSON</button>
                        <button id="export-json" class="btn btn-secondary">Export JSON</button>
                    </div>
                </div>
                <div class="results-content">
                    <div id="mod-summary" class="mod-summary"></div>
                    <div id="console-output" class="console-output"></div>
                    <div id="warnings-output" class="warnings-output"></div>
                    <div id="json-view" class="json-tree"></div>
                </div>
            </div>
        `;
        
        // Event listeners
        this.addEventListener(this.querySelector('#json-search'), 'input', (e) => this.searchJson(e.target.value));
        this.addEventListener(this.querySelector('#copy-json'), 'click', () => this.copyJson());
        this.addEventListener(this.querySelector('#export-json'), 'click', () => this.exportJson());
    }
    
    async onFileProcessed(mod) {
        await super.onFileProcessed(mod);
        
        // Use pre-parsed errors from mod object
        if (mod.errorsByFile) {
            this.issueManager.errorsByFile = new Map(mod.errorsByFile);
            this.issueManager.rawStderr = mod.result?.stderr || '';
        }
        
        // Re-render after zip is loaded to ensure hovers are set up
        const jsonView = this.container?.querySelector('#json-view');
        if (jsonView && jsonView.children.length > 0) {
            this.setupJsonFileHovers();
            this.setupFilePreviewHovers();
        }
    }
    
    setCurrentMod(mod) {
        super.setCurrentMod(mod);
        
        // Use pre-parsed errors from mod object
        if (mod?.errorsByFile) {
            this.issueManager.errorsByFile = new Map(mod.errorsByFile);
            this.issueManager.rawStderr = mod.result?.stderr || '';
        }
    }
    
    render() {
        if (!this.currentMod) {
            this.setHTML('.results-content', '<div class="empty-state">Select a mod to view results</div>');
            return;
        }
        
        const { parsed, result, errors } = this.currentMod;
        
        // Render summary first
        const summaryHtml = this.renderSummary(parsed, result);
        this.setHTML('#mod-summary', summaryHtml);
        
        // Render console output second
        const consoleHtml = this.renderConsoleOutput(result);
        this.setHTML('#console-output', consoleHtml);
        
        // Render warnings display
        const warningsHtml = this.renderWarningsDisplay();
        this.setHTML('#warnings-output', warningsHtml);
        
        // Render JSON tree last
        const jsonHtml = this.renderJsonTree(result.data);
        this.setHTML('#json-view', jsonHtml);
        
        // Make file paths in JSON hoverable
        this.setupJsonFileHovers();
        
        // Add expand/collapse handlers
        this.setupJsonExpanders();
        
        // Setup hover previews
        this.setupFilePreviewHovers();
    }
    
    renderSummary(parsed, result) {
        // Use validation result for accurate error counts
        const validationResult = this.currentMod?.validationResult;
        
        // Get stderr error count from validation result (single source of truth)
        const parserErrorIssue = validationResult?.byField.get('errors')?.[0];
        const parserErrorCount = parserErrorIssue?.value || 0;
        
        // Count warnings and errors from errorCategories
        const warningCount = this.currentMod?.errorCategories?.warnings?.length || 0;
        const errorCount = this.currentMod?.errorCategories?.stderr?.length || 0;
        
        // Get validation errors from currentMod
        const validationErrors = this.currentMod?.validationErrors || [];
        const status = this.currentMod?.status || (parserErrorCount > 0 ? 'failed' : 'success');
        
        // Determine status text and color
        let statusText = 'Success';
        let statusClass = 'success';
        if (status === 'failed') {
            statusText = 'Failed';
            statusClass = 'error';
        } else if (status === 'validation-failed') {
            statusText = 'Validation Failed';
            statusClass = 'warning';
        } else if (status === 'success-with-warnings') {
            statusText = 'Success (with Warnings)';
            statusClass = 'success-with-warnings';
        }
        
        // Helper to check if field has validation error
        const hasValidationError = (field) => validationErrors.some(e => e.field === field);
        const getValidationTooltip = (field) => {
            const error = validationErrors.find(e => e.field === field);
            return error ? error.message : '';
        };
        
        // Helper to render a summary item with copy button
        const renderSummaryItem = (label, value, field = null, isStatus = false) => {
            const hasError = field && hasValidationError(field);
            const tooltip = hasError ? getValidationTooltip(field) : '';
            const itemStatusClass = isStatus ? `summary-status-item ${statusClass}` : '';
            
            return `
                <div class="summary-item ${itemStatusClass} ${hasError ? 'validation-error' : ''}"
                     ${tooltip ? `title="${tooltip}"` : ''}>
                    <div class="summary-item-header">
                        ${label}
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapeHtml(String(value)).replace(/'/g, "\\'")}'); this.textContent='copied'; setTimeout(() => this.textContent='copy', 1000)" title="Copy to clipboard">copy</button>
                    </div>
                    <div class="summary-item-value">${value}</div>
                </div>
            `;
        };
        
        // Validation errors section - always render
        const validationErrorsSection = `
            <div class="validation-errors-section ${validationErrors.length === 0 ? 'empty' : ''}">
                ${validationErrors.length > 0 ? `
                    <h4>Validation Issues (${validationErrors.length})</h4>
                    <ul class="validation-error-list">
                        ${validationErrors.map(err => `
                            <li><strong>${err.field}:</strong> ${err.message}</li>
                        `).join('')}
                    </ul>
                ` : `
                    <div class="validation-ok">✓ No validation issues</div>
                `}
            </div>
        `;
        
        return `
            <div class="summary-grid">
                ${renderSummaryItem('Status', statusText, null, true)}
                ${renderSummaryItem('Name', parsed.name, 'name')}
                ${renderSummaryItem('ID', parsed.id, 'id')}
                ${renderSummaryItem('UUID', parsed.uuid, 'uuid')}
                ${renderSummaryItem('Game', parsed.game, 'game')}
                ${renderSummaryItem('Version', parsed.version, 'version')}
                ${renderSummaryItem('Category', parsed.category, 'category')}
                ${renderSummaryItem('Errors', errorCount, 'errors')}
                ${renderSummaryItem('Warnings', warningCount, 'warnings')}
            </div>
            ${validationErrorsSection}
        `;
    }
    
    renderJsonTree(data) {
        if (!data) {
            return '<div class="empty-state">No JSON data available</div>';
        }
        
        const result = this.renderObject(data, 0);
        // Convert to HTML string if it's a DOM element
        if (result instanceof HTMLElement) {
            const temp = document.createElement('div');
            temp.appendChild(result);
            return temp.innerHTML;
        }
        return result;
    }
    
    /**
     * Recursively render any JSON object/array structure
     * This is FULLY DYNAMIC - it renders ALL fields present in the data
     * using Object.keys() with no filtering or hardcoding of field names
     * Uses DOM createElement for better performance
     */
    renderObject(obj, depth = 0) {
        const indent = '  '.repeat(depth);
        
        // Primitives - create spans
        if (obj === null) {
            return createElement('span', { className: 'json-null', textContent: 'null' });
        }
        
        if (obj === undefined) {
            return createElement('span', { className: 'json-undefined', textContent: 'undefined' });
        }
        
        const type = typeof obj;
        
        if (type === 'boolean') {
            return createElement('span', { className: 'json-boolean', textContent: obj });
        }
        
        if (type === 'number') {
            return createElement('span', { className: 'json-number', textContent: obj });
        }
        
        if (type === 'string') {
            return createElement('span', { className: 'json-string', textContent: `"${obj}"` });
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return createElement('span', { className: 'json-array', textContent: '[]' });
            }
            
            // Check if array contains only primitives
            const isPrimitiveArray = obj.every(item => {
                const itemType = typeof item;
                return item === null || itemType === 'number' || itemType === 'string' || itemType === 'boolean';
            });
            
            if (isPrimitiveArray) {
                // Render inline for primitive arrays
                const span = createElement('span', { className: 'json-array json-array-inline' });
                span.textContent = '[';
                
                obj.forEach((item, index) => {
                    const itemEl = this.renderObject(item, depth + 1);
                    span.appendChild(itemEl);
                    if (index < obj.length - 1) {
                        span.appendChild(document.createTextNode(', '));
                    }
                });
                
                span.appendChild(document.createTextNode(']'));
                return span;
            }
            
            // Render multi-line for complex arrays
            const container = createElement('div', { className: 'json-array' });
            
            const bracket = createElement('span', {
                className: 'json-bracket json-expand',
                textContent: '▼ [',
                dataset: { expanded: 'true' }
            });
            container.appendChild(bracket);
            
            const content = createElement('div', { className: 'json-array-content' });
            
            obj.forEach((item, index) => {
                const itemDiv = createElement('div', { className: 'json-item' });
                itemDiv.appendChild(document.createTextNode(indent + '  '));
                
                const itemEl = this.renderObject(item, depth + 1);
                if (typeof itemEl === 'string') {
                    itemDiv.innerHTML += itemEl;
                } else {
                    itemDiv.appendChild(itemEl);
                }
                
                if (index < obj.length - 1) {
                    itemDiv.appendChild(document.createTextNode(','));
                }
                
                content.appendChild(itemDiv);
            });
            
            container.appendChild(content);
            container.appendChild(createElement('span', {
                className: 'json-bracket',
                textContent: indent + ']'
            }));
            
            return container;
        }
        
        if (type === 'object') {
            const keys = Object.keys(obj);
            
            if (keys.length === 0) {
                return createElement('span', { className: 'json-object', textContent: '{}' });
            }
            
            const container = createElement('div', { className: 'json-object' });
            
            const bracket = createElement('span', {
                className: 'json-bracket json-expand',
                textContent: '▼ {',
                dataset: { expanded: 'true' }
            });
            container.appendChild(bracket);
            
            const content = createElement('div', { className: 'json-object-content' });
            
            keys.forEach((key, index) => {
                const propDiv = createElement('div', { className: 'json-property' });
                propDiv.appendChild(document.createTextNode(indent + '  '));
                
                const keySpan = createElement('span', {
                    className: 'json-key',
                    textContent: `"${key}"`
                });
                propDiv.appendChild(keySpan);
                
                propDiv.appendChild(document.createTextNode(': '));
                
                const valueEl = this.renderObject(obj[key], depth + 1);
                if (typeof valueEl === 'string') {
                    propDiv.innerHTML += valueEl;
                } else {
                    propDiv.appendChild(valueEl);
                }
                
                if (index < keys.length - 1) {
                    propDiv.appendChild(document.createTextNode(','));
                }
                
                content.appendChild(propDiv);
            });
            
            container.appendChild(content);
            container.appendChild(createElement('span', {
                className: 'json-bracket',
                textContent: indent + '}'
            }));
            
            return container;
        }
        
        return createElement('span', { className: 'json-unknown', textContent: String(obj) });
    }
    
    setupJsonExpanders() {
        this.addEventListeners('.json-expand', 'click', (e) => {
            const expander = e.target;
            e.stopPropagation();
            const isExpanded = expander.dataset.expanded === 'true';
            const parent = expander.parentElement;
            const content = parent.querySelector('.json-array-content, .json-object-content');
            
            if (content) {
                expander.dataset.expanded = !isExpanded;
                expander.textContent = isExpanded ? '▶ ' : '▼ ';
                expander.textContent += isExpanded ? (parent.classList.contains('json-array') ? '[' : '{') 
                                                   : (parent.classList.contains('json-array') ? '[' : '{');
                content.style.display = isExpanded ? 'none' : 'block';
            }
        });
    }
    
    renderConsoleOutput(result) {
        // Check both result.stdout and parsed.stdout
        const stdout = result.stdout || result.data?.stdout || '';
        const stderr = result.stderr || result.data?.stderr || '';
        const analyzerError = result.success === false && result.error ? result.error : '';
        
        // Count actual errors (excluding warnings)
        const stderrErrors = this.currentMod?.errorCategories?.stderr || [];
        const hasErrors = stderrErrors.length > 0;
        
        const hasOutput = stdout || hasErrors || analyzerError;
        
        if (!hasOutput) {
            return '';
        }
        
        return `
            <div class="console-section">
                <h3>Console Output</h3>
                ${analyzerError ? `
                    <div class="console-analyzer-error">
                        <h4>Analyzer Error</h4>
                        <pre>${escapeHtml(analyzerError)}</pre>
                    </div>
                ` : ''}
                ${stdout ? `
                    <div class="console-stdout">
                        <h4>Standard Output</h4>
                        <pre>${this.highlightConsoleOutput(stdout)}</pre>
                    </div>
                ` : ''}
                ${hasErrors ? `
                    <div class="console-stderr">
                        <h4>Errors</h4>
                        <pre>${this.highlightConsoleOutput(stderr)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderWarningsDisplay() {
        // Get all warnings
        const warnings = this.currentMod?.errorCategories?.warnings || [];
        
        if (warnings.length === 0) {
            return '';
        }
        
        return `
            <div class="warnings-display-section">
                <h3>Warnings</h3>
                <div class="warnings-container">
                    <h4>⚠️ ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}</h4>
                    ${warnings.map(warn => this.renderWarningItem(warn, warn.file || 'entry.lua')).join('')}
                </div>
            </div>
        `;
    }
    
    groupWarningsByFile() {
        const warnings = this.currentMod?.errorCategories?.warnings || [];
        const grouped = {};
        
        warnings.forEach(warn => {
            const file = warn.file || 'entry.lua';
            if (!grouped[file]) {
                grouped[file] = [];
            }
            grouped[file].push(warn);
        });
        
        return grouped;
    }
    
    renderWarningItem(warn, file) {
        // Display the message with location data for hover preview
        // Extract location from message if present (format: "[ 430:29 ] message...")
        const locationMatch = warn.message?.match(/^\[\s*(\d+)\s*:\s*(\d+)\s*\]\s*(.*)/);
        
        if (locationMatch && warn.line) {
            const [, line, column, message] = locationMatch;
            return `
                <div class="warning-item">
                    <span class="warning-location" data-file="${escapeHtml(file)}" data-line="${warn.line}" data-column="${warn.column || 0}">
                        [${line}:${column}]
                    </span>
                    <span class="warning-message">${escapeHtml(message)}</span>
                </div>
            `;
        }
        
        // Otherwise just display the message
        return `
            <div class="warning-item">
                <span class="warning-message">${escapeHtml(warn.message || '')}</span>
            </div>
        `;
    }
    
    highlightConsoleOutput(text) {
        const originalLines = text.split('\n');
        const escapedLines = originalLines.map(line => escapeHtml(line));
        const processedLines = [];
        
        // Track which lines to skip (warnings and their context lines)
        const skipIndices = new Set();
        
        // Get all warnings to exclude them from error display
        const warnings = this.currentMod?.errorCategories?.warnings || [];
        const warningLocations = new Set();
        warnings.forEach(w => {
            if (w.line && w.column) {
                warningLocations.add(`${w.line}:${w.column}`);
            }
        });
        
        // Mark warning lines and their context lines for skipping
        for (let i = 0; i < originalLines.length; i++) {
            const trimmed = originalLines[i].trim();
            
            // Skip warning lines (with WARN: prefix)
            if (trimmed.startsWith('WARN:')) {
                skipIndices.add(i);
                // Also skip the next line if it's a context line
                if (i + 1 < originalLines.length && originalLines[i + 1].trim().startsWith('...')) {
                    skipIndices.add(i + 1);
                }
            }
            
            // Also skip lines that match warning locations
            const locationMatch = trimmed.match(/^\[\s*(\d+)\s*:\s*(\d+)\s*\]/);
            if (locationMatch) {
                const loc = `${locationMatch[1]}:${locationMatch[2]}`;
                if (warningLocations.has(loc)) {
                    skipIndices.add(i);
                    // Also skip the next line if it's a context line
                    if (i + 1 < originalLines.length && originalLines[i + 1].trim().startsWith('...')) {
                        skipIndices.add(i + 1);
                    }
                }
            }
        }
        
        // Track which lines have error locations (errors only, not warnings)
        const errorLineIndices = new Map(); // lineIndex -> {file, line, column}
        
        // Use already-parsed data from modData.errors to find only actual errors
        const errors = this.currentMod?.errors || [];
        const actualErrors = errors.filter(e => e.type === 'error');
        
        // Find line indices for errors
        for (let i = 0; i < originalLines.length; i++) {
            // Skip warning lines
            if (skipIndices.has(i)) {
                continue;
            }
            
            const trimmed = originalLines[i].trim();
            const locationMatch = trimmed.match(/^\[\s*(\d+)\s*:\s*(\d+)\s*\]/);
            if (locationMatch) {
                const line = parseInt(locationMatch[1]);
                const column = parseInt(locationMatch[2]);
                
                // Find the matching error from parsed data
                const matchingError = actualErrors.find(e => e.line === line && e.column === column);
                if (matchingError) {
                    errorLineIndices.set(i, {
                        file: matchingError.file,
                        line: line,
                        column: column
                    });
                }
            }
        }
        
        // Apply highlighting
        for (let i = 0; i < escapedLines.length; i++) {
            // Skip warning lines and context lines
            if (skipIndices.has(i)) {
                continue;
            }
            
            let line = escapedLines[i];
            
            // Highlight file references
            line = line.replace(/"([\w\-\.\/\\]+\.lua)"/g, (match, file) => {
                const normalizedFile = file.replace(/\\/g, '/');
                return `"<span class="console-file" data-file="${normalizedFile}">${file}</span>"`;
            });
            
            line = line.replace(/(evaluating\s+)([\w\-\.\/\\]+\.lua)/g, (match, prefix, file) => {
                const normalizedFile = file.replace(/\\/g, '/');
                return `${prefix}<span class="console-file" data-file="${normalizedFile}">${file}</span>`;
            });
            
            // Highlight error locations only
            if (errorLineIndices.has(i)) {
                const error = errorLineIndices.get(i);
                line = line.replace(
                    /^\[\s*(\d+)\s*:\s*(\d+)\s*\]/,
                    `<span class="console-location-bracket" data-file="${escapeHtml(error.file)}" data-line="${error.line}" data-column="${error.column}">[${error.line}:${error.column}]</span>`
                );
            }
            
            processedLines.push(line);
        }
        
        return processedLines.join('\n');
    }
    
    searchJson(query) {
        if (!this.currentMod || !query) {
            this.render();
            return;
        }
        
        const results = parser.searchJson(this.currentMod.result.data, query);
        
        // Highlight matching items
        const jsonView = this.container.querySelector('#json-view');
        const keys = jsonView.querySelectorAll('.json-key');
        
        keys.forEach(key => {
            const text = key.textContent.replace(/"/g, '');
            if (text.toLowerCase().includes(query.toLowerCase())) {
                key.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
            } else {
                key.style.backgroundColor = '';
            }
        });
    }
    
    copyJson() {
        if (!this.currentMod) return;
        
        const data = JSON.stringify(this.currentMod.result.data, null, 2);
        
        navigator.clipboard.writeText(data).then(() => {
            this.showButtonSuccess(this.querySelector('#copy-json'), '✓ Copied!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        });
    }
    
    exportJson() {
        if (!this.currentMod) return;
        
        const data = JSON.stringify(this.currentMod.result.data, null, 2);
        this.downloadFile(`${this.currentMod.parsed.id}_analysis.json`, data, 'application/json');
    }
    
    setupJsonFileHovers() {
        if (!this.zipArchive) return;
        
        // Get all file paths in the zip (normalize to remove trailing slashes)
        const zipFiles = Object.keys(this.zipArchive.files)
            .filter(f => !f.endsWith('/')) // Remove directory entries
            .map(f => f.replace(/^\/+/, '')); // Remove leading slashes
        
        // Find all JSON string values that might be file paths
        const jsonStrings = this.container.querySelectorAll('#json-view .json-string');
        jsonStrings.forEach(el => {
            // Get the actual text content (browser already decodes HTML entities)
            const text = el.textContent.replace(/^"|"$/g, '').trim();
            
            // Skip empty strings or very short strings (but allow 3 char extensions like .md)
            if (!text || text.length < 3) return;
            
            // Use path matching utility to find best match
            const matchingFile = findBestPathMatch(text, zipFiles);
            
            if (matchingFile) {
                addClass(el, 'json-file-path');
                el.dataset.file = matchingFile;
                el.style.cursor = 'pointer';
                el.title = 'Click to open in file browser, hover to preview';
                el.addEventListener('mouseenter', (e) => this.showFilePreview(e));
                el.addEventListener('mouseleave', () => this.hidePreview());
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openInFileBrowser(matchingFile);
                });
            }
        });
    }
    
    jumpToFileAndScroll(filePath) {
        // Switch to file browser tab
        const fileBrowserTab = document.querySelector('.tab[data-tab="files"]');
        if (fileBrowserTab) {
            fileBrowserTab.click();
            
            // Wait a bit for the tab to switch, then select the file
            setTimeout(() => {
                // Find the file browser tab instance and select the file
                const fileBrowserContent = document.querySelector('#tab-files');
                if (fileBrowserContent) {
                    const fileItem = fileBrowserContent.querySelector(`[data-path="${filePath}"]`);
                    if (fileItem) {
                        fileItem.click();
                        fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        }
    }
    
    setupFilePreviewHovers() {
        if (!this.zipArchive) return;
        
        // Get all file paths in the zip (normalize to remove trailing slashes)
        const zipFiles = Object.keys(this.zipArchive.files)
            .filter(f => !f.endsWith('/'))
            .map(f => f.replace(/^\/+/, ''));
        
        // Setup hover for ALL .lua file references in console output
        const fileElements = this.querySelectorAll('.console-file');
        fileElements.forEach(el => {
            const fileName = el.dataset.file;
            if (!fileName) return;
            
            // Check if this file exists in the zip
            const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
            
            if (matchingFile) {
                addClass(el, 'console-file-exists');
                el.style.cursor = 'pointer';
                el.title = 'Click to open in file browser, hover to preview with errors';
                
                el.addEventListener('mouseenter', (e) => this.showFilePreview(e, true));
                el.addEventListener('mouseleave', () => this.hidePreview());
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openInFileBrowser(matchingFile);
                });
            }
        });
        
        // Setup hover for bracket-style locations [line:column] - show error context
        const bracketElements = this.querySelectorAll('.console-location-bracket');
        bracketElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.title = 'Click to open in file browser, hover to preview error location';
            el.addEventListener('mouseenter', (e) => this.showBracketErrorPreview(e));
            el.addEventListener('mouseleave', () => this.hidePreview());
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fileName = e.target.dataset.file;
                const lineNumber = e.target.dataset.line;
                if (fileName) {
                    const zipFiles = Object.keys(this.zipArchive.files)
                        .filter(f => !f.endsWith('/'))
                        .map(f => f.replace(/^\/+/, ''));
                    const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
                    if (matchingFile) this.openInFileBrowser(matchingFile, lineNumber);
                }
            });
        });
        
        // Setup hover for warning locations [line:column] - show warning context with yellow highlight
        const warningElements = this.querySelectorAll('.warning-location');
        warningElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.title = 'Click to open in file browser, hover to preview warning location';
            el.addEventListener('mouseenter', (e) => this.showWarningPreview(e));
            el.addEventListener('mouseleave', () => this.hidePreview());
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fileName = e.target.dataset.file;
                const lineNumber = e.target.dataset.line;
                if (fileName) {
                    const zipFiles = Object.keys(this.zipArchive.files)
                        .filter(f => !f.endsWith('/'))
                        .map(f => f.replace(/^\/+/, ''));
                    const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
                    if (matchingFile) this.openInFileBrowser(matchingFile, lineNumber);
                }
            });
        });
    }
    
    findMatchingZipFile(fileName, zipFiles) {
        return findBestPathMatch(fileName, zipFiles);
    }
    
    async showBracketErrorPreview(event) {
        const fileName = event.target.dataset.file;
        const line = parseInt(event.target.dataset.line);
        const column = event.target.dataset.column ? parseInt(event.target.dataset.column) : null;
        
        if (!fileName || !line) return;
        
        // Find the file in zip - try to match it properly
        const zipFiles = Object.keys(this.zipArchive.files)
            .filter(f => !f.endsWith('/'))
            .map(f => f.replace(/^\/+/, ''));
        
        const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
        if (!matchingFile) return;
        
        const file = this.zipArchive.files[matchingFile];
        if (!file) return;
        
        const ext = matchingFile.split('.').pop().toLowerCase();
        const previewHtml = await this.renderTextPreview(file, fileName, ext, line, column);
        
        this.showTooltip(event.target, previewHtml);
    }
    
    async showWarningPreview(event) {
        const fileName = event.target.dataset.file;
        const line = parseInt(event.target.dataset.line);
        const column = event.target.dataset.column ? parseInt(event.target.dataset.column) : null;
        
        if (!fileName || !line) return;
        
        // Find the file in zip - try to match it properly
        const zipFiles = Object.keys(this.zipArchive.files)
            .filter(f => !f.endsWith('/'))
            .map(f => f.replace(/^\/+/, ''));
        
        const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
        if (!matchingFile) return;
        
        const file = this.zipArchive.files[matchingFile];
        if (!file) return;
        
        const ext = matchingFile.split('.').pop().toLowerCase();
        const previewHtml = await this.renderTextPreview(file, fileName, ext, line, column, 'warning');
        
        this.showTooltip(event.target, previewHtml);
    }
    
    openInFileBrowser(filePath, lineNumber = null) {
        // Switch to file browser tab
        const fileBrowserTab = document.querySelector('.tab[data-tab="files"]');
        if (fileBrowserTab) {
            fileBrowserTab.click();
            
            // Wait a bit for the tab to switch, then select the file
            setTimeout(() => {
                // Find the file browser tab instance and select the file
                const fileBrowserContent = document.querySelector('#tab-files');
                if (fileBrowserContent) {
                    const fileItem = fileBrowserContent.querySelector(`[data-path="${filePath}"]`);
                    if (fileItem) {
                        fileItem.click();
                        fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // If a line number was provided, scroll to that line
                        if (lineNumber) {
                            setTimeout(() => {
                                const codeLine = fileBrowserContent.querySelector(`.code-line[data-line="${lineNumber}"]`);
                                if (codeLine) {
                                    codeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // Highlight the line temporarily
                                    codeLine.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';
                                    setTimeout(() => {
                                        codeLine.style.backgroundColor = '';
                                    }, 2000);
                                }
                            }, 200);
                        }
                    }
                }
            }, 100);
        }
    }
    
    clear() {
        super.clear();
        this.hidePreview();
        this.issueManager.parseErrors(''); // Clear issues
        if (this.container) {
            this.setHTML('.results-content', '<div class="empty-state">No results</div>');
        }
    }
}
