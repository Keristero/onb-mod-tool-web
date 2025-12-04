// Statistics Tab - Displays aggregated statistics and metrics

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { PIE_CHART_RADIUS, PIE_CHART_CENTER, CHART_COLORS, CATEGORY_COLORS, ERROR_COLORS, STATUS_COLORS } from '../constants.mjs';
import { calculateStatistics } from './utilities/statistics-calculator.mjs';
import { createPieChart, createBarChart, initializeChartTooltips } from './utilities/chart-renderer.mjs';
import { exportToCSV, exportToXML } from './utilities/data-exporter.mjs';

export default class StatisticsTab extends BaseTab {
    constructor() {
        super();
        this.sessionMods = []; // Reset on page load
        this.currentView = 'file'; // 'file' or 'session'
        this.fileContainer = null;
        this.sessionContainer = null;
        this.renderDebounceTimer = null;
        this.hasRendered = false;
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
            this.sessionMods.unshift(mod); // Add to front
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    setCurrentMod(mod) {
        // Set as current mod
        this.currentMod = mod;
        this.needsRender = true;
        
        // Add to session mods if not already there
        const existing = this.sessionMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.sessionMods.unshift(mod); // Add to front
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    onShow() {
        // Called when tab becomes visible - render immediately
        if (this.needsRender || !this.hasRendered) {
            this.render();
            this.needsRender = false;
            this.hasRendered = true;
        }
    }
    
    render() {
        // Debounce rendering for better performance
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        this.renderDebounceTimer = setTimeout(() => {
            this._renderImmediate();
        }, 50);
    }
    
    _renderImmediate() {
        // Render both views
        this.renderFileStats();
        this.renderSessionStats();
        
        // Set up chart tooltips after rendering
        initializeChartTooltips();
    }
    
    renderFileStats() {
        if (!this.currentMod || !this.currentMod.parsed) {
            this.setHTMLForContainer(this.fileContainer, '#file-stats-content', 
                '<div class="empty-state">No mod selected. Process a mod to see its statistics.</div>');
            return;
        }
        
        const stats = calculateStatistics(this.currentMod);
        const html = this.renderStats(stats, 'file');
        this.setHTMLForContainer(this.fileContainer, '#file-stats-content', html);
    }
    
    renderSessionStats() {
        if (this.sessionMods.length === 0) {
            this.setHTMLForContainer(this.sessionContainer, '#session-stats-content', 
                '<div class="empty-state">No statistics available. Process some mods to see analytics.</div>');
            return;
        }
        
        const stats = calculateStatistics(this.sessionMods);
        const html = this.renderStats(stats, 'session');
        this.setHTMLForContainer(this.sessionContainer, '#session-stats-content', html);
    }
    
    setHTMLForContainer(container, selector, html) {
        const element = container.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    renderStats(stats, mode) {
        return `
            <div class="stats-overview">
                ${this.renderOverviewCards(stats, mode)}
            </div>
            
            <div class="stats-charts">
                <!-- Pie charts side by side -->
                <div class="chart-container">
                    <h3>Success Rate</h3>
                    ${this.renderSuccessRateChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Error Distribution</h3>
                    ${this.renderErrorDistributionChart(stats)}
                </div>
                
                <!-- Processing time and categories -->
                <div class="chart-container">
                    <h3>Processing Time ${mode === 'file' ? '' : 'Distribution'}</h3>
                    ${this.renderProcessingTimeChart(stats)}
                </div>
                
                <div class="chart-container">
                    <h3>Mod ${mode === 'file' ? 'Category' : 'Categories'}</h3>
                    ${this.renderCategoriesChart(stats, mode)}
                </div>
                
                <!-- Error types full width -->
                <div class="chart-container full-width">
                    <h3>Error Types</h3>
                    ${this.renderErrorTypesChart(stats)}
                </div>
                
                <!-- Expandable error details -->
                ${stats.stderrErrors > 0 ? `
                <div class="chart-container full-width">
                    <details id="stderr-errors-details">
                        <summary>Most Common Stderr Errors (${stats.stderrErrors})</summary>
                        ${this.renderErrorMessagesChart(stats.stderrMessages)}
                    </details>
                </div>
                ` : ''}
                
                ${stats.validationErrors > 0 ? `
                <div class="chart-container full-width">
                    <details id="validation-errors-details">
                        <summary>Most Common Validation Errors (${stats.validationErrors})</summary>
                        ${this.renderErrorMessagesChart(stats.validationMessages)}
                    </details>
                </div>
                ` : ''}
                
                ${stats.analyzerErrors > 0 ? `
                <div class="chart-container full-width">
                    <details id="analyzer-errors-details">
                        <summary>Most Common Analyzer Errors (${stats.analyzerErrors})</summary>
                        ${this.renderErrorMessagesChart(stats.analyzerMessages)}
                    </details>
                </div>
                ` : ''}
                
                ${mode === 'session' ? `
                <div class="chart-container full-width">
                    <h3>Errors by File</h3>
                    ${this.renderErrorsByFileChart(stats)}
                </div>
                ` : ''}
            </div>
            
            ${mode === 'session' && stats.failedMods && stats.failedMods.length > 0 ? `
            <div class="stats-section">
                <h3>Failed to Parse (${stats.failedMods.length})</h3>
                <div class="failed-mods-list">
                    ${stats.failedMods.map(mod => `
                        <div class="failed-mod-item">
                            <div class="failed-mod-name">${this.escapeHtml(mod.fileName)}</div>
                            <div class="failed-mod-error">${this.escapeHtml(mod.error || 'Unknown error')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }
    
    renderOverviewCards(stats, mode) {
        if (mode === 'file') {
            // Determine status for file view
            let statusText = 'Success';
            let statusColor = STATUS_COLORS.success;
            if (stats.failed === 1) {
                statusText = 'Failed';
                statusColor = STATUS_COLORS.error;
            } else if (stats.validationFailed === 1) {
                statusText = 'Validation Failed';
                statusColor = STATUS_COLORS.warning;
            }
            
            return `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Status</h3>
                        <div class="stat-value" style="color: ${statusColor}">
                            ${statusText}
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
                        <h3>Validation Errors</h3>
                        <div class="stat-value" style="color: var(--warning-color)">${stats.validationErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Analyzer Errors</h3>
                        <div class="stat-value" style="color: var(--error-color)">${stats.analyzerErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Stderr Errors</h3>
                        <div class="stat-value" style="color: var(--error-color)">${stats.stderrErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Other Errors</h3>
                        <div class="stat-value" style="color: var(--warning-color)">${stats.otherErrors}</div>
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
                    <h3>Parse Success Rate</h3>
                    <div class="stat-value" style="color: ${stats.successRate > 80 ? 'var(--success-color)' : 'var(--warning-color)'}">
                        ${stats.successRate}%
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Validation Success Rate</h3>
                    <div class="stat-value" style="color: ${stats.validationSuccessRate > 80 ? 'var(--success-color)' : 'var(--warning-color)'}">
                        ${stats.validationSuccessRate}%
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Successful</h3>
                    <div class="stat-value" style="color: var(--success-color)">${stats.successful}</div>
                </div>
                <div class="stat-card">
                    <h3>Validation Failed</h3>
                    <div class="stat-value" style="color: var(--warning-color)">${stats.validationFailed || 0}</div>
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
                <div class="stat-card">
                    <h3>Validation Errors</h3>
                    <div class="stat-value" style="color: var(--warning-color)">${stats.validationErrors}</div>
                </div>
                <div class="stat-card">
                    <h3>Analyzer Errors</h3>
                    <div class="stat-value" style="color: var(--error-color)">${stats.analyzerErrors}</div>
                </div>
                <div class="stat-card">
                    <h3>Stderr Errors</h3>
                    <div class="stat-value" style="color: var(--error-color)">${stats.stderrErrors}</div>
                </div>
                <div class="stat-card">
                    <h3>Other Errors</h3>
                    <div class="stat-value" style="color: var(--warning-color)">${stats.otherErrors}</div>
                </div>
            </div>
        `;
    }
    
    renderSuccessRateChart(stats) {
        // Prepare segments for pie chart
        const segments = [];
        
        if (stats.successful > 0) {
            segments.push({
                label: 'Success',
                value: stats.successful,
                color: STATUS_COLORS.success
            });
        }
        
        if (stats.validationFailed > 0) {
            segments.push({
                label: 'Validation Failed',
                value: stats.validationFailed,
                color: STATUS_COLORS.warning
            });
        }
        
        if (stats.failed > 0) {
            segments.push({
                label: 'Failed',
                value: stats.failed,
                color: STATUS_COLORS.error
            });
        }
        
        const { svg, legend } = createPieChart(segments, {
            radius: PIE_CHART_RADIUS,
            center: PIE_CHART_CENTER
        });
        
        return `
            <div class="chart-subtitle">Parse Success: ${stats.successRate}% | Validation Success: ${stats.validationSuccessRate}%</div>
            <div class="pie-chart">
                ${svg}
                <div class="chart-legend">
                    ${legend}
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
    
    renderErrorDistributionChart(stats) {
        const validationErrors = stats.validationErrors || 0;
        const analyzerErrors = stats.analyzerErrors || 0;
        const stderrErrors = stats.stderrErrors || 0;
        const otherErrors = stats.otherErrors || 0;
        const totalErrors = validationErrors + analyzerErrors + stderrErrors + otherErrors;
        
        if (totalErrors === 0) {
            return '<div class="empty-state">No errors recorded</div>';
        }
        
        // Prepare segments for pie chart
        const segments = [];
        
        if (validationErrors > 0) {
            segments.push({
                label: 'Validation',
                value: validationErrors,
                color: ERROR_COLORS.validation
            });
        }
        
        if (analyzerErrors > 0) {
            segments.push({
                label: 'Analyzer',
                value: analyzerErrors,
                color: ERROR_COLORS.analyzer
            });
        }
        
        if (stderrErrors > 0) {
            segments.push({
                label: 'Stderr',
                value: stderrErrors,
                color: ERROR_COLORS.stderr
            });
        }
        
        if (otherErrors > 0) {
            segments.push({
                label: 'Other',
                value: otherErrors,
                color: ERROR_COLORS.other
            });
        }
        
        const { svg, legend } = createPieChart(segments, {
            radius: PIE_CHART_RADIUS,
            center: PIE_CHART_CENTER
        });
        
        return `
            <div class="pie-chart">
                ${svg}
                <div class="chart-legend">
                    ${legend}
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
        
        const items = sorted.map(([type, count]) => ({
            label: type,
            value: count
        }));
        
        return createBarChart(items, {
            barColor: 'var(--error-color)',
            limit: 10
        });
    }
    
    renderErrorMessagesChart(errorMessages) {
        if (!errorMessages || Object.keys(errorMessages).length === 0) {
            return '<div class="empty-state">No error messages recorded</div>';
        }
        
        const sorted = Object.entries(errorMessages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // Show top 20 most common errors
        
        const items = sorted.map(([message, count]) => ({
            label: message,
            value: count
        }));
        
        return createBarChart(items, {
            barColor: 'var(--warning-color)',
            maxLabelLength: 80,
            limit: 20
        });
    }
    
    renderErrorsByFileChart(stats) {
        if (Object.keys(stats.errorsByFile).length === 0) {
            return '<div class="empty-state">No errors recorded</div>';
        }
        
        const sorted = Object.entries(stats.errorsByFile)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const items = sorted.map(([file, count]) => ({
            label: file,
            value: count
        }));
        
        return createBarChart(items, {
            barColor: 'var(--warning-color)',
            maxLabelLength: 30,
            limit: 10
        });
    }
    
    renderCategoriesChart(stats, mode) {
        if (Object.keys(stats.categories).length === 0) {
            return '<div class="empty-state">No category data</div>';
        }
        
        // For file view (single category), show simple text
        if (mode === 'file') {
            const category = Object.keys(stats.categories)[0];
            return `
                <div class="stats-list">
                    <div class="stat-row">
                        <span>${category}</span>
                        <strong>1 mod</strong>
                    </div>
                </div>
            `;
        }
        
        // For session view (multiple categories), show pie chart
        const sorted = Object.entries(stats.categories)
            .sort((a, b) => b[1] - a[1]);
        
        // Prepare segments for pie chart
        const segments = sorted.map(([category, count], index) => {
            const color = CATEGORY_COLORS[category.toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length];
            return {
                label: category,
                value: count,
                color
            };
        });
        
        const { svg, legend } = createPieChart(segments, {
            radius: PIE_CHART_RADIUS,
            center: PIE_CHART_CENTER
        });
        
        return `
            <div class="pie-chart">
                ${svg}
                <div class="chart-legend">
                    ${legend}
                </div>
            </div>
        `;
    }
    
    exportCSV(mode) {
        const mods = mode === 'file' && this.currentMod ? [this.currentMod] : this.sessionMods;
        const stats = calculateStatistics(mods);
        const csv = exportToCSV(stats, mods, mode);
        const filename = mode === 'file' ? `${this.currentMod.fileName}-statistics.csv` : 'session-statistics.csv';
        this.downloadFile(filename, csv, 'text/csv');
    }
    
    exportXML(mode) {
        const mods = mode === 'file' && this.currentMod ? [this.currentMod] : this.sessionMods;
        const stats = calculateStatistics(mods);
        const xml = exportToXML(stats, mods, mode);
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
