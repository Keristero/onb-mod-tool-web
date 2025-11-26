// Results Tab - Displays JSON analysis results

import * as parser from '../parser.mjs';

export default class ResultsTab {
    constructor() {
        this.container = null;
        this.currentMod = null;
    }
    
    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="results-view">
                <div class="results-header">
                    <h2>Analysis Results</h2>
                    <div class="results-actions">
                        <input type="text" id="json-search" class="filter-input" placeholder="Search JSON..." />
                        <button id="export-json" class="btn btn-secondary">Export JSON</button>
                    </div>
                </div>
                <div class="results-content">
                    <div id="mod-summary" class="mod-summary"></div>
                    <div id="json-view" class="json-tree"></div>
                    <div id="console-output" class="console-output"></div>
                </div>
            </div>
        `;
        
        // Event listeners
        const searchInput = this.container.querySelector('#json-search');
        searchInput.addEventListener('input', (e) => this.searchJson(e.target.value));
        
        const exportBtn = this.container.querySelector('#export-json');
        exportBtn.addEventListener('click', () => this.exportJson());
    }
    
    onFileProcessed(mod) {
        this.currentMod = mod;
    }
    
    render() {
        if (!this.currentMod) {
            this.container.querySelector('.results-content').innerHTML = 
                '<div class="empty-state">Select a mod to view results</div>';
            return;
        }
        
        const { parsed, result, errors } = this.currentMod;
        
        // Render summary
        const summaryHtml = this.renderSummary(parsed, result);
        this.container.querySelector('#mod-summary').innerHTML = summaryHtml;
        
        // Render JSON tree
        const jsonHtml = this.renderJsonTree(result.data);
        this.container.querySelector('#json-view').innerHTML = jsonHtml;
        
        // Add expand/collapse handlers
        this.setupJsonExpanders();
        
        // Render console output
        const consoleHtml = this.renderConsoleOutput(result);
        this.container.querySelector('#console-output').innerHTML = consoleHtml;
    }
    
    renderSummary(parsed, result) {
        const errorCount = parsed.stderr ? parsed.stderr.split('\n').filter(l => l.startsWith('ERR:')).length : 0;
        const warnCount = parsed.stderr ? parsed.stderr.split('\n').filter(l => l.startsWith('WARN:')).length : 0;
        
        return `
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Name:</strong> ${parsed.name}
                </div>
                <div class="summary-item">
                    <strong>ID:</strong> ${parsed.id}
                </div>
                <div class="summary-item">
                    <strong>Version:</strong> ${parsed.version}
                </div>
                <div class="summary-item">
                    <strong>Category:</strong> ${parsed.category}
                </div>
                <div class="summary-item">
                    <strong>Size:</strong> ${parser.formatBytes(parsed.bytes)}
                </div>
                <div class="summary-item">
                    <strong>Processing Time:</strong> ${parser.formatDuration(result.processingTime)}
                </div>
                <div class="summary-item ${errorCount > 0 ? 'error' : 'success'}">
                    <strong>Errors:</strong> ${errorCount}
                </div>
                <div class="summary-item ${warnCount > 0 ? 'warning' : ''}">
                    <strong>Warnings:</strong> ${warnCount}
                </div>
            </div>
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
        const expanders = this.container.querySelectorAll('.json-expand');
        expanders.forEach(expander => {
            expander.addEventListener('click', (e) => {
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
        });
    }
    
    renderConsoleOutput(result) {
        const hasOutput = result.stdout || result.stderr;
        if (!hasOutput) {
            return '';
        }
        
        return `
            <div class="console-section">
                <h3>Console Output</h3>
                ${result.stdout ? `<div class="console-stdout"><pre>${escapeHtml(result.stdout)}</pre></div>` : ''}
                ${result.stderr ? `<div class="console-stderr"><pre>${escapeHtml(result.stderr)}</pre></div>` : ''}
            </div>
        `;
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
    
    exportJson() {
        if (!this.currentMod) return;
        
        const data = JSON.stringify(this.currentMod.result.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentMod.parsed.id}_analysis.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    clear() {
        this.currentMod = null;
        if (this.container) {
            this.container.querySelector('.results-content').innerHTML = 
                '<div class="empty-state">No results</div>';
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
