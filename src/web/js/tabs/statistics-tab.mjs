// Statistics Tab - Displays aggregated statistics and metrics

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';

export default class StatisticsTab extends BaseTab {
    constructor() {
        super();
        this.allMods = [];
    }
    
    async init(container) {
        await super.init(container);
        this.container.innerHTML = `
            <div class="statistics-view">
                <div class="statistics-header">
                    <h2>Statistics & Analytics</h2>
                    <div class="statistics-actions">
                        <button id="export-stats-csv" class="btn btn-secondary">Export CSV</button>
                        <button id="export-stats-xml" class="btn btn-secondary">Export XML</button>
                        <button id="clear-stats" class="btn btn-secondary">Clear Data</button>
                    </div>
                </div>
                <div id="stats-content" class="statistics-content"></div>
            </div>
        `;
        
        // Event listeners
        this.addEventListener(this.querySelector('#export-stats-csv'), 'click', () => this.exportCSV());
        this.addEventListener(this.querySelector('#export-stats-xml'), 'click', () => this.exportXML());
        this.addEventListener(this.querySelector('#clear-stats'), 'click', () => this.clearStats());
        
        // Load saved statistics
        this.loadStats();
    }
    
    onFileProcessed(mod) {
        // Add to collection if not already there
        const existing = this.allMods.find(m => m.id === mod.id);
        if (!existing) {
            this.allMods.push(mod);
            this.saveStats();
        }
    }
    
    render() {
        if (this.allMods.length === 0) {
            this.setHTML('#stats-content', 
                '<div class="empty-state">No statistics available. Process some mods to see analytics.</div>');
            return;
        }
        
        const stats = this.calculateStats();
        const html = this.renderStats(stats);
        this.setHTML('#stats-content', html);
    }
    
    calculateStats() {
        const total = this.allMods.length;
        const successful = this.allMods.filter(m => m.status === 'success').length;
        const failed = this.allMods.filter(m => m.status === 'failed').length;
        
        const processingTimes = this.allMods
            .filter(m => m.processingTime)
            .map(m => m.processingTime);
        
        const avgTime = processingTimes.length > 0
            ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
            : 0;
        
        const minTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
        const maxTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
        
        // Error analysis
        const errorTypes = {};
        const errorsByFile = {};
        
        this.allMods.forEach(mod => {
            if (mod.errors && mod.errors.length > 0) {
                errorsByFile[mod.fileName] = mod.errors.length;
                
                mod.errors.forEach(error => {
                    const type = this.categorizeError(error.message);
                    errorTypes[type] = (errorTypes[type] || 0) + 1;
                });
            }
        });
        
        // Category breakdown
        const categories = {};
        this.allMods.forEach(mod => {
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
            errorsByFile,
            categories,
            totalErrors: Object.values(errorTypes).reduce((a, b) => a + b, 0)
        };
    }
    
    categorizeError(message) {
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('parse') || lowerMsg.includes('syntax')) return 'Syntax Error';
        if (lowerMsg.includes('not found') || lowerMsg.includes('missing')) return 'Missing File/Resource';
        if (lowerMsg.includes('invalid') || lowerMsg.includes('malformed')) return 'Invalid Format';
        if (lowerMsg.includes('type')) return 'Type Error';
        if (lowerMsg.includes('undefined') || lowerMsg.includes('nil')) return 'Undefined Reference';
        
        return 'Other';
    }
    
    renderStats(stats) {
        return `
            <div class="stats-overview">
                ${this.renderOverviewCards(stats)}
            </div>
            
            <div class="stats-charts">
                <div class="chart-container">
                    <h3>Success Rate</h3>
                    ${this.renderSuccessRateChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Processing Time Distribution</h3>
                    ${this.renderProcessingTimeChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Error Types</h3>
                    ${this.renderErrorTypesChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Errors by File</h3>
                    ${this.renderErrorsByFileChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Mod Categories</h3>
                    ${this.renderCategoriesChart(stats)}
                </div>
            </div>
        `;
    }
    
    renderOverviewCards(stats) {
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
    
    exportCSV() {
        const headers = ['Filename', 'Status', 'Category', 'Errors', 'Warnings', 'Processing Time (ms)', 'Size (bytes)', 'Timestamp'];
        const rows = this.allMods.map(mod => [
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
        
        this.downloadFile('mod-statistics.csv', csv, 'text/csv');
    }
    
    exportXML() {
        const stats = this.calculateStats();
        
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
        ${this.allMods.map(mod => `
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
        
        this.downloadFile('mod-statistics.xml', xml, 'application/xml');
    }
    

    

    
    saveStats() {
        try {
            const data = this.allMods.map(mod => ({
                id: mod.id,
                fileName: mod.fileName,
                fileSize: mod.fileSize,
                status: mod.status,
                processingTime: mod.processingTime,
                timestamp: mod.timestamp,
                parsed: mod.parsed,
                errors: mod.errors
            }));
            
            localStorage.setItem('modAnalyzer:statistics', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save statistics:', error);
        }
    }
    
    loadStats() {
        try {
            const saved = localStorage.getItem('modAnalyzer:statistics');
            if (saved) {
                this.allMods = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load statistics:', error);
        }
    }
    
    clearStats() {
        if (confirm('Clear all statistics data? This cannot be undone.')) {
            this.allMods = [];
            localStorage.removeItem('modAnalyzer:statistics');
            this.render();
        }
    }
    
    clear() {
        // Don't clear allMods - statistics persist across sessions
        // Just re-render to show current state
    }
}
