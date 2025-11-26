// Statistics Tab - Displays aggregated statistics and metrics

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';

export default class StatisticsTab extends BaseTab {
    constructor() {
        super();
        this.sessionMods = []; // Reset on page load
        this.currentView = 'file'; // 'file' or 'session'
        this.fileContainer = null;
        this.sessionContainer = null;
    }
    
    async init(container) {
        // Don't call super.init since we have two containers
        this.container = container;
        
        // Get both sub-tab containers
        this.fileContainer = document.querySelector('#sub-tab-statistics-file .tab-panel');
        this.sessionContainer = document.querySelector('#sub-tab-statistics-session .tab-panel');
        
        // Initialize file view
        this.fileContainer.innerHTML = `
            <div class="statistics-view">
                <div class="statistics-header">
                    <h2>Current File Statistics</h2>
                    <div class="statistics-actions">
                        <button id="export-file-stats-csv" class="btn btn-secondary">Export CSV</button>
                        <button id="export-file-stats-xml" class="btn btn-secondary">Export XML</button>
                    </div>
                </div>
                <div id="file-stats-content" class="statistics-content"></div>
            </div>
        `;
        
        // Initialize session view
        this.sessionContainer.innerHTML = `
            <div class="statistics-view">
                <div class="statistics-header">
                    <h2>Session Statistics</h2>
                    <div class="statistics-actions">
                        <button id="export-session-stats-csv" class="btn btn-secondary">Export CSV</button>
                        <button id="export-session-stats-xml" class="btn btn-secondary">Export XML</button>
                        <button id="clear-session-stats" class="btn btn-secondary">Clear Session</button>
                    </div>
                </div>
                <div id="session-stats-content" class="statistics-content"></div>
            </div>
        `;
        
        // Event listeners for file view
        this.fileContainer.querySelector('#export-file-stats-csv')?.addEventListener('click', () => this.exportCSV('file'));
        this.fileContainer.querySelector('#export-file-stats-xml')?.addEventListener('click', () => this.exportXML('file'));
        
        // Event listeners for session view
        this.sessionContainer.querySelector('#export-session-stats-csv')?.addEventListener('click', () => this.exportCSV('session'));
        this.sessionContainer.querySelector('#export-session-stats-xml')?.addEventListener('click', () => this.exportXML('session'));
        this.sessionContainer.querySelector('#clear-session-stats')?.addEventListener('click', () => this.clearSessionStats());
    }
    
    async onFileProcessed(mod) {
        // Set as current mod
        this.currentMod = mod;
        
        // Add to session mods if not already there
        const existing = this.sessionMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.sessionMods.push(mod);
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    render() {
        // Render both views
        this.renderFileStats();
        this.renderSessionStats();
    }
    
    renderFileStats() {
        if (!this.currentMod || !this.currentMod.parsed) {
            this.setHTMLForContainer(this.fileContainer, '#file-stats-content', 
                '<div class="empty-state">No mod selected. Process a mod to see its statistics.</div>');
            return;
        }
        
        const stats = this.calculateStatsForMod(this.currentMod);
        const html = this.renderStats(stats, 'file');
        this.setHTMLForContainer(this.fileContainer, '#file-stats-content', html);
    }
    
    renderSessionStats() {
        if (this.sessionMods.length === 0) {
            this.setHTMLForContainer(this.sessionContainer, '#session-stats-content', 
                '<div class="empty-state">No statistics available. Process some mods to see analytics.</div>');
            return;
        }
        
        const stats = this.calculateStats(this.sessionMods);
        const html = this.renderStats(stats, 'session');
        this.setHTMLForContainer(this.sessionContainer, '#session-stats-content', html);
    }
    
    setHTMLForContainer(container, selector, html) {
        const element = container.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    calculateStatsForMod(mod) {
        // Calculate statistics for a single mod
        const stats = {
            total: 1,
            successful: mod.status === 'success' ? 1 : 0,
            failed: mod.status === 'failed' ? 1 : 0,
            successRate: mod.status === 'success' ? 100 : 0,
            avgTime: mod.processingTime || 0,
            minTime: mod.processingTime || 0,
            maxTime: mod.processingTime || 0,
            errorTypes: {},
            errorMessages: {},
            errorsByFile: {},
            categories: {},
            totalErrors: 0
        };
        
        // Error analysis
        if (mod.errors && mod.errors.length > 0) {
            stats.errorsByFile[mod.fileName] = mod.errors.length;
            
            mod.errors.forEach(error => {
                const type = this.categorizeError(error.message);
                stats.errorTypes[type] = (stats.errorTypes[type] || 0) + 1;
                
                // Track individual error messages
                // Exclude context/stack trace lines that start with "..."
                // Exclude "Errors while evaluating" summary lines
                const msg = error.message || error.line || '';
                const isStackTrace = msg.trim().startsWith('...');
                const isEvalError = msg.startsWith('Errors while evaluating');
                
                if (!isStackTrace && !isEvalError && msg) {
                    // Clean the message by removing [line:column] prefix
                    const cleanMsg = parser.cleanErrorMessage(msg);
                    if (cleanMsg) {
                        stats.errorMessages[cleanMsg] = (stats.errorMessages[cleanMsg] || 0) + 1;
                    }
                }
            });
            
            stats.totalErrors = mod.errors.length;
        }
        
        // Category
        if (mod.parsed && mod.parsed.category) {
            stats.categories[mod.parsed.category] = 1;
        }
        
        return stats;
    }
    
    calculateStats(mods) {
        const total = mods.length;
        const successful = mods.filter(m => m.status === 'success').length;
        const failed = mods.filter(m => m.status === 'failed').length;
        
        const processingTimes = mods
            .filter(m => m.processingTime)
            .map(m => m.processingTime);
        
        const avgTime = processingTimes.length > 0
            ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
            : 0;
        
        const minTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
        const maxTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
        
        // Error analysis
        const errorTypes = {};
        const errorMessages = {};
        const errorsByFile = {};
        
        mods.forEach(mod => {
            if (mod.errors && mod.errors.length > 0) {
                errorsByFile[mod.fileName] = mod.errors.length;
                
                mod.errors.forEach(error => {
                    const type = this.categorizeError(error.message);
                    errorTypes[type] = (errorTypes[type] || 0) + 1;
                    
                    // Track individual error messages
                    // Exclude context/stack trace lines that start with "..."
                    // Exclude "Errors while evaluating" summary lines
                    const msg = error.message || error.line || '';
                    const isStackTrace = msg.trim().startsWith('...');
                    const isEvalError = msg.startsWith('Errors while evaluating');
                    
                    if (!isStackTrace && !isEvalError && msg) {
                        // Clean the message by removing [line:column] prefix
                        const cleanMsg = parser.cleanErrorMessage(msg);
                        if (cleanMsg) {
                            errorMessages[cleanMsg] = (errorMessages[cleanMsg] || 0) + 1;
                        }
                    }
                });
            }
        });
        
        // Category breakdown
        const categories = {};
        mods.forEach(mod => {
            if (mod.parsed && mod.parsed.category) {
                const cat = mod.parsed.category;
                categories[cat] = (categories[cat] || 0) + 1;
            }
        });
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            avgTime,
            minTime,
            maxTime,
            errorTypes,
            errorMessages,
            errorsByFile,
            categories,
            totalErrors: Object.values(errorTypes).reduce((a, b) => a + b, 0)
        };
    }
    
    categorizeError(message) {
        const lowerMsg = message.toLowerCase();
        
        // Parser-specific errors with location [line:col]
        if (/^\[\d+:\d+\]/.test(message)) {
            if (lowerMsg.includes('missing') && lowerMsg.includes('parenthes')) {
                return 'Missing Parentheses';
            }
            if (lowerMsg.includes('expected') && lowerMsg.includes('parenthes')) {
                return 'Expected Parentheses';
            }
            if (lowerMsg.includes('expected literal') || lowerMsg.includes('expected.*variable')) {
                return 'Expected Literal/Variable';
            }
            if (lowerMsg.includes('expected')) {
                return 'Expected Token';
            }
            if (lowerMsg.includes('found') && lowerMsg.includes('tokentype')) {
                return 'Unexpected Token';
            }
            return 'Parser Error';
        }
        
        // File evaluation errors
        if (lowerMsg.includes('errors while evaluating')) {
            return 'File Evaluation Error';
        }
        
        // Generic categorization
        if (lowerMsg.includes('parse') || lowerMsg.includes('syntax')) {
            return 'Syntax Error';
        }
        if (lowerMsg.includes('not found') || lowerMsg.includes('missing')) {
            return 'Missing File/Resource';
        }
        if (lowerMsg.includes('invalid') || lowerMsg.includes('malformed')) {
            return 'Invalid Format';
        }
        if (lowerMsg.includes('type')) {
            return 'Type Error';
        }
        if (lowerMsg.includes('undefined') || lowerMsg.includes('nil')) {
            return 'Undefined Reference';
        }
        
        return 'Other';
    }
    
    renderStats(stats, mode) {
        return `
            <div class="stats-overview">
                ${this.renderOverviewCards(stats, mode)}
            </div>
            
            <div class="stats-charts">
                <div class="chart-container">
                    <h3>Success Rate</h3>
                    ${this.renderSuccessRateChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Processing Time ${mode === 'file' ? '' : 'Distribution'}</h3>
                    ${this.renderProcessingTimeChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Error Types</h3>
                    ${this.renderErrorTypesChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Most Common Error Messages</h3>
                    ${this.renderErrorMessagesChart(stats)}
                </div>
                
                ${mode === 'session' ? `
                <div class="chart-container">
                    <h3>Errors by File</h3>
                    ${this.renderErrorsByFileChart(stats)}
                </div>
                ` : ''}
                
                <div class="chart-container">
                    <h3>Mod ${mode === 'file' ? 'Category' : 'Categories'}</h3>
                    ${this.renderCategoriesChart(stats)}
                </div>
            </div>
        `;
    }
    
    renderOverviewCards(stats, mode) {
        if (mode === 'file') {
            return `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Status</h3>
                        <div class="stat-value" style="color: ${stats.successful === 1 ? 'var(--success-color)' : 'var(--error-color)'}">
                            ${stats.successful === 1 ? 'Success' : 'Failed'}
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>Processing Time</h3>
                        <div class="stat-value">${parser.formatDuration(stats.avgTime)}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Total Errors</h3>
                        <div class="stat-value" style="color: var(--error-color)">${stats.totalErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Category</h3>
                        <div class="stat-value" style="font-size: 1.25rem;">${Object.keys(stats.categories)[0] || 'Unknown'}</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Analyzed</h3>
                    <div class="stat-value">${stats.total}</div>
                </div>
                <div class="stat-card">
                    <h3>Success Rate</h3>
                    <div class="stat-value" style="color: ${stats.successRate > 80 ? 'var(--success-color)' : 'var(--warning-color)'}">
                        ${stats.successRate}%
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Successful</h3>
                    <div class="stat-value" style="color: var(--success-color)">${stats.successful}</div>
                </div>
                <div class="stat-card">
                    <h3>Failed</h3>
                    <div class="stat-value" style="color: var(--error-color)">${stats.failed}</div>
                </div>
                <div class="stat-card">
                    <h3>Avg Processing Time</h3>
                    <div class="stat-value">${parser.formatDuration(stats.avgTime)}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Errors</h3>
                    <div class="stat-value" style="color: var(--error-color)">${stats.totalErrors}</div>
                </div>
            </div>
        `;
    }
    
    renderSuccessRateChart(stats) {
        const successPercent = stats.successRate;
        const failPercent = 100 - successPercent;
        
        return `
            <div class="pie-chart">
                <svg viewBox="0 0 200 200" style="max-width: 300px; margin: 0 auto;">
                    <circle cx="100" cy="100" r="80" fill="var(--success-color)" 
                            stroke-dasharray="${successPercent * 5.03} ${failPercent * 5.03}" 
                            stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
                    <circle cx="100" cy="100" r="80" fill="none" stroke="var(--error-color)" 
                            stroke-width="80" stroke-dasharray="${failPercent * 5.03} ${successPercent * 5.03}" 
                            stroke-dashoffset="${-successPercent * 5.03}" transform="rotate(-90 100 100)"/>
                </svg>
                <div class="chart-legend">
                    <div><span style="color: var(--success-color)">●</span> Success: ${stats.successful}</div>
                    <div><span style="color: var(--error-color)">●</span> Failed: ${stats.failed}</div>
                </div>
            </div>
        `;
    }
    
    renderProcessingTimeChart(stats) {
        return `
            <div class="stats-list">
                <div class="stat-row">
                    <span>Average:</span>
                    <strong>${parser.formatDuration(stats.avgTime)}</strong>
                </div>
                <div class="stat-row">
                    <span>Minimum:</span>
                    <strong>${parser.formatDuration(stats.minTime)}</strong>
                </div>
                <div class="stat-row">
                    <span>Maximum:</span>
                    <strong>${parser.formatDuration(stats.maxTime)}</strong>
                </div>
            </div>
        `;
    }
    
    renderErrorTypesChart(stats) {
        if (Object.keys(stats.errorTypes).length === 0) {
            return '<div class="empty-state">No errors recorded</div>';
        }
        
        const sorted = Object.entries(stats.errorTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const max = sorted[0][1];
        
        return `
            <div class="bar-chart">
                ${sorted.map(([type, count]) => {
                    const percent = (count / max * 100);
                    return `
                        <div class="bar-item">
                            <div class="bar-label">${type}</div>
                            <div class="bar-visual">
                                <div class="bar-fill" style="width: ${percent}%; background: var(--error-color)"></div>
                                <span class="bar-count">${count}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderErrorMessagesChart(stats) {
        if (!stats.errorMessages || Object.keys(stats.errorMessages).length === 0) {
            return '<div class="empty-state">No error messages recorded</div>';
        }
        
        const sorted = Object.entries(stats.errorMessages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // Show top 20 most common errors
        
        const max = sorted[0][1];
        
        return `
            <div class="bar-chart">
                ${sorted.map(([message, count]) => {
                    const percent = (count / max * 100);
                    // Truncate long error messages for display
                    const shortMessage = message.length > 80 ? message.slice(0, 77) + '...' : message;
                    return `
                        <div class="bar-item">
                            <div class="bar-label" title="${this.escapeHtml(message)}">${this.escapeHtml(shortMessage)}</div>
                            <div class="bar-visual">
                                <div class="bar-fill" style="width: ${percent}%; background: var(--warning-color)"></div>
                                <span class="bar-count">${count}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderErrorsByFileChart(stats) {
        if (Object.keys(stats.errorsByFile).length === 0) {
            return '<div class="empty-state">No errors recorded</div>';
        }
        
        const sorted = Object.entries(stats.errorsByFile)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const max = sorted[0][1];
        
        return `
            <div class="bar-chart">
                ${sorted.map(([file, count]) => {
                    const percent = (count / max * 100);
                    const shortName = file.length > 30 ? file.slice(0, 27) + '...' : file;
                    return `
                        <div class="bar-item">
                            <div class="bar-label" title="${file}">${shortName}</div>
                            <div class="bar-visual">
                                <div class="bar-fill" style="width: ${percent}%; background: var(--warning-color)"></div>
                                <span class="bar-count">${count}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderCategoriesChart(stats) {
        if (Object.keys(stats.categories).length === 0) {
            return '<div class="empty-state">No category data</div>';
        }
        
        const sorted = Object.entries(stats.categories)
            .sort((a, b) => b[1] - a[1]);
        
        return `
            <div class="stats-list">
                ${sorted.map(([category, count]) => `
                    <div class="stat-row">
                        <span>${category}</span>
                        <strong>${count}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    exportCSV(mode) {
        const mods = mode === 'file' && this.currentMod ? [this.currentMod] : this.sessionMods;
        const headers = ['Filename', 'Status', 'Category', 'Errors', 'Warnings', 'Processing Time (ms)', 'Size (bytes)', 'Timestamp'];
        const rows = mods.map(mod => [
            mod.fileName,
            mod.status,
            mod.parsed?.category || '',
            mod.errors?.filter(e => e.type === 'error').length || 0,
            mod.errors?.filter(e => e.type === 'warning').length || 0,
            mod.processingTime || 0,
            mod.fileSize || 0,
            mod.timestamp || ''
        ]);
        
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const filename = mode === 'file' ? `${this.currentMod.fileName}-statistics.csv` : 'session-statistics.csv';
        this.downloadFile(filename, csv, 'text/csv');
    }
    
    exportXML(mode) {
        const mods = mode === 'file' && this.currentMod ? [this.currentMod] : this.sessionMods;
        const stats = this.calculateStats(mods);
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<modStatistics>
    <summary>
        <total>${stats.total}</total>
        <successful>${stats.successful}</successful>
        <failed>${stats.failed}</failed>
        <successRate>${stats.successRate}</successRate>
        <avgProcessingTime>${stats.avgTime}</avgProcessingTime>
        <totalErrors>${stats.totalErrors}</totalErrors>
    </summary>
    <mods>
        ${mods.map(mod => `
        <mod>
            <filename>${this.escapeXml(mod.fileName)}</filename>
            <status>${mod.status}</status>
            <category>${this.escapeXml(mod.parsed?.category || '')}</category>
            <processingTime>${mod.processingTime || 0}</processingTime>
            <size>${mod.fileSize || 0}</size>
            <errors>
                ${(mod.errors || []).map(e => `
                <error type="${e.type}">${this.escapeXml(e.message)}</error>
                `).join('')}
            </errors>
        </mod>
        `).join('')}
    </mods>
</modStatistics>`;
        
        const filename = mode === 'file' ? `${this.currentMod.fileName}-statistics.xml` : 'session-statistics.xml';
        this.downloadFile(filename, xml, 'application/xml');
    }
    
    clearSessionStats() {
        if (confirm('Clear all session statistics? This cannot be undone.')) {
            this.sessionMods = [];
            this.render();
        }
    }
    
    clear() {
        // Clear session data on history clear
        this.sessionMods = [];
        this.currentMod = null;
        this.render();
    }
}
