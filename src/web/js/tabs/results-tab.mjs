// Results Tab - Displays JSON analysis results

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { FilePreviewMixin } from './file-preview-mixin.mjs';
import { ErrorManager } from './error-manager.mjs';

export default class ResultsTab extends BaseTab {
    constructor() {
        super();
        // Mix in file preview functionality
        Object.assign(this, FilePreviewMixin);
        this.errorManager = new ErrorManager();
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
        
        // Parse errors from stderr
        if (mod.result && mod.result.stderr) {
            this.errorManager.parseErrors(mod.result.stderr);
        }
        
        // Run validation only once (on first processing)
        if (mod.parsed && mod.result && !mod.validationComplete) {
            const stderr = mod.result.stderr || mod.parsed.stderr || '';
            const errorCount = (stderr.match(/\[\s*\d+\s*:\s*\d+\s*\]/g) || []).length 
                || stderr.split('\n').filter(l => l.trim().startsWith('ERR:')).length;
            
            const validationErrors = parser.validateModSummary(mod.parsed, errorCount);
            mod.validationErrors = validationErrors;
            
            // Initialize error category arrays
            mod.errorCategories = {
                validation: validationErrors || [],
                analyzer: [],
                stderr: mod.errors || [],
                other: []
            };
            
            // Collect analyzer errors
            if (mod.result && mod.result.success === false && mod.result.error) {
                mod.errorCategories.analyzer.push({
                    type: 'analyzer-result',
                    message: mod.result.error
                });
            }
            
            if (mod.parsed && mod.parsed.category === 'err') {
                mod.errorCategories.analyzer.push({
                    type: 'category-err',
                    message: 'Mod category is "err"'
                });
            }
            
            if (mod.error && (mod.error.includes('timeout') || mod.error.includes('Worker timeout'))) {
                mod.errorCategories.analyzer.push({
                    type: 'timeout',
                    message: mod.error
                });
            }
            
            // Calculate three-tier status
            const hasAnalyzerError = mod.errorCategories.analyzer.length > 0;
            const hasParserError = hasAnalyzerError;
            
            if (hasParserError) {
                mod.status = 'failed';
                // Set error message if not already set
                if (!mod.error) {
                    if (mod.result && mod.result.error) {
                        mod.error = `Analyzer error: ${mod.result.error}`;
                    } else {
                        mod.error = 'Parser failure - mod category is "err"';
                    }
                }
            } else if (validationErrors.length > 0) {
                mod.status = 'validation-failed';
            } else {
                mod.status = 'success';
            }
            
            // Mark as validated
            mod.validationComplete = true;
        }
        
        // Re-render after zip is loaded to ensure hovers are set up
        const jsonView = this.container?.querySelector('#json-view');
        if (jsonView && jsonView.children.length > 0) {
            this.setupJsonFileHovers();
            this.setupFilePreviewHovers();
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
        // Count errors from both parsed stderr and result stderr
        const stderr = result.stderr || parsed.stderr || '';
        // Match [line:column] format or ERR: prefix
        const errorCount = (stderr.match(/\[\s*\d+\s*:\s*\d+\s*\]/g) || []).length 
            || stderr.split('\n').filter(l => l.trim().startsWith('ERR:')).length;
        const warnCount = stderr.split('\n').filter(l => l.trim().startsWith('WARN:')).length;
        
        // Get validation errors from currentMod
        const validationErrors = this.currentMod?.validationErrors || [];
        const status = this.currentMod?.status || (errorCount > 0 ? 'failed' : 'success');
        
        // Determine status text and color
        let statusText = 'Success';
        let statusClass = 'success';
        if (status === 'failed') {
            statusText = 'Failed';
            statusClass = 'error';
        } else if (status === 'validation-failed') {
            statusText = 'Validation Failed';
            statusClass = 'warning';
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
            </div>
            ${validationErrorsSection}
        `;
    }
    
    renderJsonTree(data) {
        if (!data) {
            return '<div class="empty-state">No JSON data available</div>';
        }
        
        return this.renderObject(data, 0);
    }
    
    renderObject(obj, depth = 0) {
        const indent = '  '.repeat(depth);
        
        if (obj === null) return '<span class="json-null">null</span>';
        if (obj === undefined) return '<span class="json-undefined">undefined</span>';
        
        const type = typeof obj;
        
        if (type === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }
        
        if (type === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }
        
        if (type === 'string') {
            return `<span class="json-string">"${escapeHtml(obj)}"</span>`;
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return '<span class="json-array">[]</span>';
            }
            
            // Check if array contains only primitives (numbers, strings, booleans, null)
            const isPrimitiveArray = obj.every(item => {
                const itemType = typeof item;
                return item === null || itemType === 'number' || itemType === 'string' || itemType === 'boolean';
            });
            
            if (isPrimitiveArray) {
                // Render inline for primitive arrays
                const items = obj.map(item => {
                    if (item === null) return '<span class="json-null">null</span>';
                    if (typeof item === 'boolean') return `<span class="json-boolean">${item}</span>`;
                    if (typeof item === 'number') return `<span class="json-number">${item}</span>`;
                    if (typeof item === 'string') return `<span class="json-string">"${escapeHtml(item)}"</span>`;
                }).join(', ');
                
                return `<span class="json-array json-array-inline">[${items}]</span>`;
            }
            
            // Render multi-line for complex arrays
            let html = '<div class="json-array">';
            html += `<span class="json-bracket json-expand" data-expanded="true">▼ [</span>`;
            html += '<div class="json-array-content">';
            
            obj.forEach((item, index) => {
                html += `<div class="json-item">${indent}  `;
                html += this.renderObject(item, depth + 1);
                if (index < obj.length - 1) html += ',';
                html += '</div>';
            });
            
            html += `</div>${indent}<span class="json-bracket">]</span>`;
            html += '</div>';
            return html;
        }
        
        if (type === 'object') {
            const keys = Object.keys(obj);
            
            if (keys.length === 0) {
                return '<span class="json-object">{}</span>';
            }
            
            let html = '<div class="json-object">';
            html += `<span class="json-bracket json-expand" data-expanded="true">▼ {</span>`;
            html += '<div class="json-object-content">';
            
            keys.forEach((key, index) => {
                html += `<div class="json-property">`;
                html += `${indent}  <span class="json-key">"${escapeHtml(key)}"</span>: `;
                html += this.renderObject(obj[key], depth + 1);
                if (index < keys.length - 1) html += ',';
                html += '</div>';
            });
            
            html += `</div>${indent}<span class="json-bracket">}</span>`;
            html += '</div>';
            return html;
        }
        
        return `<span class="json-unknown">${String(obj)}</span>`;
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
        const hasOutput = stdout || stderr || analyzerError;
        
        // Debug logging
        console.log('renderConsoleOutput - result:', result);
        console.log('stdout found:', !!stdout, 'length:', stdout.length);
        console.log('stderr found:', !!stderr, 'length:', stderr.length);
        console.log('analyzer error:', analyzerError);
        
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
                ${stderr ? `
                    <div class="console-stderr">
                        <h4>Standard Error</h4>
                        <pre>${this.highlightConsoleOutput(stderr)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    highlightConsoleOutput(text) {
        // Parse with error manager (already done in onFileProcessed, but this ensures it's available)
        if (!this.errorManager.rawStderr) {
            this.errorManager.parseErrors(text);
        }
        
        const originalLines = text.split('\n');
        const escapedLines = originalLines.map(line => escapeHtml(line));
        const processedLines = [];
        
        // Track which lines have error locations
        const errorLineIndices = new Map(); // lineIndex -> {file, line, column}
        
        for (let i = 0; i < originalLines.length; i++) {
            const locationMatch = originalLines[i].match(/^\[\s*(\d+)\s*:\s*(\d+)\s*\]/);
            if (locationMatch) {
                // Get the file for this error from error manager
                let errorFile = 'entry.lua';
                
                // Look ahead to find file mention
                for (let j = i; j < Math.min(i + 5, originalLines.length); j++) {
                    const fileMatch = originalLines[j].match(/"([\w\-\.\/\\]+\.lua)"/) ||
                                     originalLines[j].match(/evaluating\s+([\w\-\.\/\\]+\.lua)/) ||
                                     originalLines[j].match(/in\s+"([\w\-\.\/\\]+\.lua)"/);
                    if (fileMatch) {
                        errorFile = fileMatch[1].replace(/\\/g, '/');
                        break;
                    }
                }
                
                errorLineIndices.set(i, {
                    file: errorFile,
                    line: parseInt(locationMatch[1]),
                    column: parseInt(locationMatch[2])
                });
            }
        }
        
        // Apply highlighting
        for (let i = 0; i < escapedLines.length; i++) {
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
            
            // Highlight error locations
            if (errorLineIndices.has(i)) {
                const error = errorLineIndices.get(i);
                line = line.replace(
                    /^\[\s*(\d+)\s*:\s*(\d+)\s*\]/,
                    `<span class="console-location-bracket" data-file="${this.escapeHtml(error.file)}" data-line="${error.line}" data-column="${error.column}">[${error.line}:${error.column}]</span>`
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
            
            // Normalize the text path
            const normalizedText = text.replace(/\\/g, '/');
            
            // Check if this string matches any file in the zip
            const matchingFile = zipFiles.find(f => {
                const normalizedFile = f.replace(/\\/g, '/');
                
                // Direct match
                if (normalizedFile === normalizedText) return true;
                
                // File ends with the text (e.g., "mod/gfx/file.png" ends with "gfx/file.png")
                if (normalizedFile.endsWith('/' + normalizedText)) return true;
                
                // File contains the text path anywhere
                if (normalizedFile.includes('/' + normalizedText + '/') || 
                    normalizedFile.includes('/' + normalizedText)) return true;
                
                // Just filename match (e.g., "bomb.lua" matches "path/to/bomb.lua")
                const fileName = normalizedFile.split('/').pop();
                if (fileName === normalizedText) return true;
                
                // Handle case where text might have leading path that's not in zip
                // (e.g., text="sfx/file.ogg" but zip has "mod/sfx/file.ogg")
                const textParts = normalizedText.split('/');
                if (textParts.length > 1) {
                    const textFileName = textParts[textParts.length - 1];
                    const textPath = textParts.slice(0, -1).join('/');
                    if (normalizedFile.endsWith(textPath + '/' + textFileName)) return true;
                }
                
                return false;
            });
            
            if (matchingFile) {
                el.classList.add('json-file-path');
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
    
    openInFileBrowser(filePath) {
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
                el.classList.add('console-file-exists');
                el.style.cursor = 'pointer';
                el.title = 'Click to open in file browser, hover to preview with errors';
                
                // Show preview with errors when hovering
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
                if (fileName) {
                    const zipFiles = Object.keys(this.zipArchive.files)
                        .filter(f => !f.endsWith('/'))
                        .map(f => f.replace(/^\/+/, ''));
                    const matchingFile = this.findMatchingZipFile(fileName, zipFiles);
                    if (matchingFile) this.openInFileBrowser(matchingFile);
                }
            });
        });
    }
    
    findMatchingZipFile(fileName, zipFiles) {
        const normalizedFileName = fileName.replace(/\\/g, '/');
        
        // Try to find exact or partial matches
        for (const zipFile of zipFiles) {
            const normalizedZipFile = zipFile.replace(/\\/g, '/');
            
            // Direct match
            if (normalizedZipFile === normalizedFileName) return zipFile;
            
            // Zip file ends with the fileName
            if (normalizedZipFile.endsWith('/' + normalizedFileName)) return zipFile;
            
            // fileName is a relative path that matches end of zip path
            if (normalizedZipFile.endsWith(normalizedFileName)) return zipFile;
            
            // Just filename match
            const zipBasename = normalizedZipFile.split('/').pop();
            const fileBasename = normalizedFileName.split('/').pop();
            if (zipBasename === fileBasename) return zipFile;
        }
        
        return null;
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
    
    openInFileBrowser(filePath) {
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
    
    clear() {
        super.clear();
        this.hidePreview();
        this.errorManager.parseErrors(''); // Clear errors
        if (this.container) {
            this.setHTML('.results-content', '<div class="empty-state">No results</div>');
        }
    }
}

// Utility function for global use
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
