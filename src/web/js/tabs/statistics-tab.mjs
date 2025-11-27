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
            validationFailed: mod.status === 'validation-failed' ? 1 : 0,
            failed: mod.status === 'failed' ? 1 : 0,
            successRate: mod.status === 'success' ? 100 : 0,
            validationSuccessRate: (mod.status === 'success' || mod.status === 'validation-failed') ? 100 : 0,
            avgTime: mod.processingTime || 0,
            minTime: mod.processingTime || 0,
            maxTime: mod.processingTime || 0,
            errorTypes: {},
            errorMessages: {},
            errorsByFile: {},
            categories: {},
            totalErrors: 0,
            parserErrors: 0,
            validationErrors: 0,
            analyzerErrors: 0
        };
        
        // Analyzer error tracking
        if (mod.result && mod.result.success === false && mod.result.error) {
            stats.analyzerErrors = 1;
            stats.errorTypes['Analyzer Error'] = 1;
            stats.totalErrors += 1;
        }
        
        // Validation error tracking
        if (mod.validationErrors && mod.validationErrors.length > 0) {
            stats.validationErrors = mod.validationErrors.length;
        }
        
        // Error analysis (parser errors)
        if (mod.errors && mod.errors.length > 0) {
            stats.errorsByFile[mod.fileName] = mod.errors.length;
            stats.parserErrors = mod.errors.length;
            
            mod.errors.forEach(error => {
                const type = this.categorizeError(error.message, false);
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
        
        // Add validation errors to error types
        if (mod.validationErrors && mod.validationErrors.length > 0) {
            stats.errorTypes['Web Validation'] = mod.validationErrors.length;
            stats.totalErrors += mod.validationErrors.length;
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
        const validationFailed = mods.filter(m => m.status === 'validation-failed').length;
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
        let totalParserErrors = 0;
        let totalValidationErrors = 0;
        let totalAnalyzerErrors = 0;
        
        mods.forEach(mod => {
            // Analyzer errors
            if (mod.result && mod.result.success === false && mod.result.error) {
                totalAnalyzerErrors += 1;
                errorTypes['Analyzer Error'] = (errorTypes['Analyzer Error'] || 0) + 1;
            }
            
            // Parser errors
            if (mod.errors && mod.errors.length > 0) {
                errorsByFile[mod.fileName] = mod.errors.length;
                totalParserErrors += mod.errors.length;
                
                mod.errors.forEach(error => {
                    const type = this.categorizeError(error.message, false);
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
            
            // Validation errors
            if (mod.validationErrors && mod.validationErrors.length > 0) {
                totalValidationErrors += mod.validationErrors.length;
                errorTypes['Web Validation'] = (errorTypes['Web Validation'] || 0) + mod.validationErrors.length;
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
        
        // Collect failed mods for detailed list
        const failedMods = mods.filter(m => m.status === 'failed').map(m => ({
            fileName: m.fileName,
            error: m.error || 'Parser failure'
        }));
        
        return {
            total,
            successful,
            validationFailed,
            failed,
            successRate: total > 0 ? ((successful + validationFailed) / total * 100).toFixed(1) : 0,
            validationSuccessRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            avgTime,
            minTime,
            maxTime,
            errorTypes,
            errorMessages,
            errorsByFile,
            categories,
            totalErrors: totalParserErrors + totalValidationErrors + totalAnalyzerErrors,
            parserErrors: totalParserErrors,
            validationErrors: totalValidationErrors,
            analyzerErrors: totalAnalyzerErrors,
            failedMods
        };
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    categorizeError(message, isValidationError = false) {
        if (isValidationError) {
            return 'Web Validation';
        }
        
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
                    <h3>Error Distribution</h3>
                    ${this.renderErrorDistributionChart(stats)}
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
            let statusColor = 'var(--success-color)';
            if (stats.failed === 1) {
                statusText = 'Failed';
                statusColor = 'var(--error-color)';
            } else if (stats.validationFailed === 1) {
                statusText = 'Validation Failed';
                statusColor = 'var(--warning-color)';
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
                        <h3>Analyzer Errors</h3>
                        <div class="stat-value" style="color: var(--error-color)">${stats.analyzerErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Parser Errors</h3>
                        <div class="stat-value" style="color: var(--error-color)">${stats.parserErrors}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Validation Errors</h3>
                        <div class="stat-value" style="color: var(--warning-color)">${stats.validationErrors}</div>
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
                    <h3>Parser Errors</h3>
                    <div class="stat-value" style="color: var(--error-color)">${stats.parserErrors}</div>
                </div>
                <div class="stat-card">
                    <h3>Validation Errors</h3>
                    <div class="stat-value" style="color: var(--warning-color)">${stats.validationErrors}</div>
                </div>
            </div>
        `;
    }
    
    renderSuccessRateChart(stats) {
        const successPercent = stats.successRate;
        const validationFailedPercent = stats.validationFailed ? (stats.validationFailed / stats.total * 100) : 0;
        const failPercent = 100 - successPercent - validationFailedPercent;
        
        // Three-tier pie chart using SVG paths
        const radius = 80;
        const center = 100;
        
        // Calculate arc paths
        const successAngle = (stats.successful / stats.total) * 360;
        const validationFailedAngle = (stats.validationFailed / stats.total) * 360;
        const failedAngle = (stats.failed / stats.total) * 360;
        
        const createArc = (startAngle, endAngle, color) => {
            const start = (startAngle - 90) * Math.PI / 180;
            const end = (endAngle - 90) * Math.PI / 180;
            const x1 = center + radius * Math.cos(start);
            const y1 = center + radius * Math.sin(start);
            const x2 = center + radius * Math.cos(end);
            const y2 = center + radius * Math.sin(end);
            const largeArc = endAngle - startAngle > 180 ? 1 : 0;
            
            return `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />`;
        };
        
        let currentAngle = 0;
        let chartPaths = '';
        
        if (stats.successful > 0) {
            chartPaths += createArc(currentAngle, currentAngle + successAngle, 'var(--success-color)');
            currentAngle += successAngle;
        }
        
        if (stats.validationFailed > 0) {
            chartPaths += createArc(currentAngle, currentAngle + validationFailedAngle, 'var(--warning-color)');
            currentAngle += validationFailedAngle;
        }
        
        if (stats.failed > 0) {
            chartPaths += createArc(currentAngle, currentAngle + failedAngle, 'var(--error-color)');
        }
        
        return `
            <div class="pie-chart">
                <svg viewBox="0 0 200 200" style="max-width: 300px; margin: 0 auto;">
                    ${chartPaths}
                </svg>
                <div class="chart-legend">
                    <div><span style="color: var(--success-color)">●</span> Success: ${stats.successful}</div>
                    <div><span style="color: var(--warning-color)">●</span> Validation Failed: ${stats.validationFailed || 0}</div>
                    <div><span style="color: var(--error-color)">●</span> Failed: ${stats.failed}</div>
                </div>
                <div class="chart-stats">
                    <div><strong>Parse Success Rate:</strong> ${stats.successRate}%</div>
                    <div><strong>Validation Success Rate:</strong> ${stats.validationSuccessRate}%</div>
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
        const parserErrors = stats.parserErrors || 0;
        const validationErrors = stats.validationErrors || 0;
        const totalErrors = parserErrors + validationErrors;
        
        if (totalErrors === 0) {
            return '<div class="empty-state">No errors recorded</div>';
        }
        
        const parserPercent = (parserErrors / totalErrors) * 100;
        const validationPercent = (validationErrors / totalErrors) * 100;
        
        // Create pie chart
        const radius = 80;
        const center = 100;
        
        const parserAngle = (parserErrors / totalErrors) * 360;
        const validationAngle = (validationErrors / totalErrors) * 360;
        
        const createArc = (startAngle, endAngle, color) => {
            if (endAngle - startAngle === 0) return '';
            const start = (startAngle - 90) * Math.PI / 180;
            const end = (endAngle - 90) * Math.PI / 180;
            const x1 = center + radius * Math.cos(start);
            const y1 = center + radius * Math.sin(start);
            const x2 = center + radius * Math.cos(end);
            const y2 = center + radius * Math.sin(end);
            const largeArc = endAngle - startAngle > 180 ? 1 : 0;
            
            return `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />`;
        };
        
        let chartPaths = '';
        if (parserErrors > 0) {
            chartPaths += createArc(0, parserAngle, 'var(--error-color)');
        }
        if (validationErrors > 0) {
            chartPaths += createArc(parserAngle, parserAngle + validationAngle, 'var(--warning-color)');
        }
        
        return `
            <div class="pie-chart">
                <svg viewBox="0 0 200 200" style="max-width: 300px; margin: 0 auto;">
                    ${chartPaths}
                </svg>
                <div class="chart-legend">
                    <div><span style="color: var(--error-color)">●</span> Parser Errors: ${parserErrors} (${parserPercent.toFixed(1)}%)</div>
                    <div><span style="color: var(--warning-color)">●</span> Validation Errors: ${validationErrors} (${validationPercent.toFixed(1)}%)</div>
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
        const headers = ['Filename', 'Status', 'Validation Status', 'Category', 'Parser Errors', 'Validation Errors', 'Warnings', 'Processing Time (ms)', 'Size (bytes)', 'Validation Error Details', 'Timestamp'];
        const rows = mods.map(mod => {
            const validationStatus = mod.status === 'validation-failed' ? 'Validation Failed' : 
                                    mod.status === 'failed' ? 'Failed' : 'Success';
            const parserErrors = mod.errors?.filter(e => e.type === 'error').length || 0;
            const validationErrors = mod.validationErrors?.length || 0;
            const validationDetails = mod.validationErrors?.map(e => `${e.field}: ${e.message}`).join('; ') || '';
            
            return [
                mod.fileName,
                mod.status,
                validationStatus,
                mod.parsed?.category || '',
                parserErrors,
                validationErrors,
                mod.errors?.filter(e => e.type === 'warning').length || 0,
                mod.processingTime || 0,
                mod.fileSize || 0,
                validationDetails,
                mod.timestamp || ''
            ];
        });
        
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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
        <validationFailed>${stats.validationFailed || 0}</validationFailed>
        <failed>${stats.failed}</failed>
        <successRate>${stats.successRate}</successRate>
        <validationSuccessRate>${stats.validationSuccessRate}</validationSuccessRate>
        <avgProcessingTime>${stats.avgTime}</avgProcessingTime>
        <totalErrors>${stats.totalErrors}</totalErrors>
        <parserErrors>${stats.parserErrors}</parserErrors>
        <validationErrors>${stats.validationErrors}</validationErrors>
    </summary>
    <mods>
        ${mods.map(mod => {
            const validationStatus = mod.status === 'validation-failed' ? 'Validation Failed' : 
                                    mod.status === 'failed' ? 'Failed' : 'Success';
            const parserErrors = mod.errors?.filter(e => e.type === 'error').length || 0;
            const validationErrorCount = mod.validationErrors?.length || 0;
            
            return `
        <mod>
            <filename>${this.escapeXml(mod.fileName)}</filename>
            <status>${this.escapeXml(mod.status)}</status>
            <validationStatus>${this.escapeXml(validationStatus)}</validationStatus>
            <category>${this.escapeXml(mod.parsed?.category || '')}</category>
            <processingTime>${mod.processingTime || 0}</processingTime>
            <size>${mod.fileSize || 0}</size>
            <parserErrors count="${parserErrors}">
                ${(mod.errors || []).map(e => `
                <error type="${this.escapeXml(e.type)}">${this.escapeXml(e.message)}</error>
                `).join('')}
            </parserErrors>
            <validationErrors count="${validationErrorCount}">
                ${(mod.validationErrors || []).map(e => `
                <error field="${this.escapeXml(e.field)}">${this.escapeXml(e.message)}</error>
                `).join('')}
            </validationErrors>
        </mod>
            `;
        }).join('')}
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
