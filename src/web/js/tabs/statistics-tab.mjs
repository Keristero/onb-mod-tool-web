// Statistics Tab - Displays aggregated statistics and metrics

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';
import { FilePreviewMixin } from './file-preview-mixin.mjs';
import { PIE_CHART_RADIUS, PIE_CHART_CENTER, CHART_COLORS, CATEGORY_COLORS, ERROR_COLORS, STATUS_COLORS } from '../constants.mjs';
import { calculateStatistics, calculateFileSizeStatistics } from './utilities/statistics-calculator.mjs';
import { createPieChart, createBarChart, createHistogram, initializeChartTooltips } from './utilities/chart-renderer.mjs';
import { exportToCSV, exportToXML, exportDuplicationCSV, exportDuplicationXML } from './utilities/data-exporter.mjs';
import { escapeHtml } from '../utils/html-utils.mjs';
import { formatBytes } from '../utils/format-utils.mjs';

export default class StatisticsTab extends BaseTab {
    constructor(duplicationTracker = null) {
        super();
        // Mix in file preview functionality
        Object.assign(this, FilePreviewMixin);
        this.sessionMods = []; // Reset on page load
        this.currentView = 'file'; // 'file' or 'session'
        this.fileContainer = null;
        this.sessionContainer = null;
        this.renderDebounceTimer = null;
        this.hasRendered = false;
        this.duplicationTracker = duplicationTracker;
        this.currentSortBy = 'count'; // Default sort by occurrences
        this.sortDirection = 'desc'; // 'asc' or 'desc'
        this.selectedDuplicateHash = null; // For drill-down view
        this.loadedThumbnails = new Set(); // Track loaded thumbnails to prevent reloading
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
        
        // Mark that we need to render, but don't render immediately
        // Let the debouncing in render() handle batch updates efficiently
        this.needsRender = true;
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
        // Debounce rendering for better performance during batch operations
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        // Use longer debounce (200ms) to handle batch uploads more efficiently
        this.renderDebounceTimer = setTimeout(() => {
            this._renderImmediate();
        }, 200);
    }
    
    _renderImmediate() {
        // Render both views
        this.renderFileStats();
        this.renderSessionStats();
        
        // Set up chart tooltips after rendering
        initializeChartTooltips();
        
        // Set up file size filter handlers
        this.setupFileSizeHandlers();
        
        // Set up duplication table event handlers
        this.setupDuplicationHandlers();
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
        let html = this.renderStats(stats, 'session');
        
        // Add file size analysis if tracker is available
        if (this.duplicationTracker) {
            html += this.renderFileSizeSection(stats);
        }
        
        // Add duplication report if tracker is available
        if (this.duplicationTracker) {
            html += this.renderDuplicationReport();
        }
        
        this.setHTMLForContainer(this.sessionContainer, '#session-stats-content', html);
    }
    
    setHTMLForContainer(container, selector, html) {
        const element = container.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    renderStats(stats, mode) {
        // Helper to create a chart container
        const chart = (title, content, fullWidth = false) => `
            <div class="chart-container${fullWidth ? ' full-width' : ''}">
                <h3>${title}</h3>
                ${content}
            </div>
        `;
        
        // Helper to create expandable error details
        const errorDetails = (id, title, count, messages) => 
            count > 0 ? `
                <div class="chart-container full-width">
                    <details id="${id}">
                        <summary>${title} (${count})</summary>
                        ${this.renderErrorMessagesChart(messages)}
                    </details>
                </div>
            ` : '';
        
        // Helper to create expandable warning details
        const warningDetails = (id, title, count, messages) => 
            count > 0 ? `
                <div class="chart-container full-width">
                    <details id="${id}" open>
                        <summary>${title} (${count})</summary>
                        ${this.renderWarningMessagesChart(messages)}
                    </details>
                </div>
            ` : '';
        
        // Helper to render failed mods section
        const failedModsSection = () => 
            mode === 'session' && stats.failedMods?.length > 0 ? `
                <div class="stats-section">
                    <h3>Failed to Parse (${stats.failedMods.length})</h3>
                    <div class="failed-mods-list">
                        ${stats.failedMods.map(mod => `
                            <div class="failed-mod-item">
                                <div class="failed-mod-name">${escapeHtml(mod.fileName)}</div>
                                <div class="failed-mod-error">${escapeHtml(mod.error || 'Unknown error')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';
        
        return `
            <div class="stats-overview">
                ${this.renderOverviewCards(stats, mode)}
            </div>
            
            <div class="stats-charts">
                ${chart('Success Rate', this.renderSuccessRateChart(stats))}
                ${chart('Issue Distribution', this.renderErrorDistributionChart(stats))}
                ${chart(`Processing Time ${mode === 'file' ? '' : 'Distribution'}`, this.renderProcessingTimeChart(stats))}
                ${chart(`Mod ${mode === 'file' ? 'Category' : 'Categories'}`, this.renderCategoriesChart(stats, mode))}
                ${chart('Error Types', this.renderErrorTypesChart(stats), true)}
                ${errorDetails('stderr-errors-details', 'Most Common Stderr Errors', stats.stderrErrors, stats.stderrMessages)}
                ${warningDetails('warnings-details', 'Most Common Warnings', stats.totalWarnings, stats.warningMessages)}
                ${errorDetails('validation-errors-details', 'Most Common Validation Errors', stats.validationErrors, stats.validationMessages)}
                ${errorDetails('analyzer-errors-details', 'Most Common Analyzer Errors', stats.analyzerErrors, stats.analyzerMessages)}
                ${mode === 'session' ? chart('Errors by File', this.renderErrorsByFileChart(stats), true) : ''}
            </div>
            
            ${failedModsSection()}
        `;
    }
    
    renderOverviewCards(stats, mode) {
        // Helper to create a stat card
        const card = (title, value, color = null, style = null) => `
            <div class="stat-card">
                <h3>${title}</h3>
                <div class="stat-value" ${color ? `style="color: ${color}${style ? `; ${style}` : ''}"` : style ? `style="${style}"` : ''}>
                    ${value}
                </div>
            </div>
        `;
        
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
            } else if (stats.successWithWarnings === 1) {
                statusText = 'Success (with Warnings)';
                statusColor = 'var(--validation-warning-color)';
            }
            
            return `
                <div class="stats-grid">
                    ${card('Status', statusText, statusColor)}
                    ${card('Processing Time', parser.formatDuration(stats.avgTime))}
                    ${card('Total Errors', stats.totalErrors, 'var(--error-color)')}
                    ${card('Total Warnings', stats.totalWarnings, 'var(--validation-warning-color)')}
                    ${card('Validation Errors', stats.validationErrors, 'var(--warning-color)')}
                    ${card('Analyzer Errors', stats.analyzerErrors, 'var(--error-color)')}
                    ${card('Stderr Errors', stats.stderrErrors, 'var(--error-color)')}
                    ${card('Other Errors', stats.otherErrors, 'var(--warning-color)')}
                    ${card('Category', Object.keys(stats.categories)[0] || '[web-default: Unknown]', null, 'font-size: 1.25rem;')}
                </div>
            `;
        }
        
        const successRateColor = stats.successRate > 80 ? 'var(--success-color)' : 'var(--warning-color)';
        const validationRateColor = stats.validationSuccessRate > 80 ? 'var(--success-color)' : 'var(--warning-color)';
        const modsWithWarningsRateColor = stats.modsWithWarningsRate > 0 ? 'var(--validation-warning-color)' : 'var(--text-secondary)';
        
        return `
            <div class="stats-grid">
                ${card('Total Analyzed', stats.total)}
                ${card('Parse Success Rate', `${stats.successRate}%`, successRateColor)}
                ${card('Validation Success Rate', `${stats.validationSuccessRate}%`, validationRateColor)}
                ${card('Mods with Warnings', `${stats.modsWithWarningsRate}%`, modsWithWarningsRateColor)}
                ${card('Successful', stats.successful, 'var(--success-color)')}
                ${card('Successful With Warnings', stats.successWithWarnings || 0, 'var(--validation-warning-color)')}
                ${card('Validation Failed', stats.validationFailed || 0, 'var(--warning-color)')}
                ${card('Failed', stats.failed, 'var(--error-color)')}
                ${card('Avg Processing Time', parser.formatDuration(stats.avgTime))}
                ${card('Total Errors', stats.totalErrors, 'var(--error-color)')}
                ${card('Total Warnings', stats.totalWarnings || 0, 'var(--validation-warning-color)')}
                ${card('Validation Errors', stats.validationErrors, 'var(--warning-color)')}
                ${card('Analyzer Errors', stats.analyzerErrors, 'var(--error-color)')}
                ${card('Stderr Errors', stats.stderrErrors, 'var(--error-color)')}
                ${card('Other Errors', stats.otherErrors, 'var(--warning-color)')}
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
        const warnings = stats.totalWarnings || 0;
        const totalIssues = validationErrors + analyzerErrors + stderrErrors + otherErrors + warnings;
        
        if (totalIssues === 0) {
            return '<div class="empty-state">No issues recorded</div>';
        }
        
        // Prepare segments for pie chart
        const segments = [];
        
        if (validationErrors > 0) {
            segments.push({
                label: 'Validation Errors',
                value: validationErrors,
                color: ERROR_COLORS.validation
            });
        }
        
        if (analyzerErrors > 0) {
            segments.push({
                label: 'Analyzer Errors',
                value: analyzerErrors,
                color: ERROR_COLORS.analyzer
            });
        }
        
        if (stderrErrors > 0) {
            segments.push({
                label: 'Stderr Errors',
                value: stderrErrors,
                color: ERROR_COLORS.stderr
            });
        }
        
        if (otherErrors > 0) {
            segments.push({
                label: 'Other Errors',
                value: otherErrors,
                color: ERROR_COLORS.other
            });
        }
        
        if (warnings > 0) {
            segments.push({
                label: 'Warnings',
                value: warnings,
                color: 'var(--validation-warning-color)'
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
    
    renderWarningMessagesChart(warningMessages) {
        if (!warningMessages || Object.keys(warningMessages).length === 0) {
            return '<div class="empty-state">No warning messages recorded</div>';
        }
        
        const sorted = Object.entries(warningMessages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // Show top 20 most common warnings
        
        const items = sorted.map(([message, count]) => ({
            label: message,
            value: count
        }));
        
        return createBarChart(items, {
            barColor: 'var(--validation-warning-color)',
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
    
    setupFileSizeHandlers() {
        const sessionContent = this.sessionContainer.querySelector('#session-stats-content');
        if (!sessionContent) return;
        
        // Category filter dropdown handler
        const categoryFilter = sessionContent.querySelector('#file-size-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                const selectedCategory = e.target.value;
                this.updateFileSizeDisplay(selectedCategory);
            });
        }
    }
    
    updateFileSizeDisplay(category) {
        if (!this.duplicationTracker) return;
        
        // Get files with metadata
        const files = this.duplicationTracker.getFilesWithMetadata();
        
        // Create category map from session mods
        const categoryMap = {};
        this.sessionMods.forEach(mod => {
            if (mod.parsed && mod.parsed.category) {
                categoryMap[mod.id] = mod.parsed.category;
            }
        });
        
        // Recalculate statistics with filter
        const fileSizeStats = calculateFileSizeStatistics(
            files, 
            categoryMap, 
            { category: category || null }
        );
        
        // Update only the relevant sections
        const sessionContent = this.sessionContainer.querySelector('#session-stats-content');
        if (!sessionContent) return;
        
        // Update stats cards
        const statsOverview = sessionContent.querySelector('.file-size-section .stats-overview');
        if (statsOverview) {
            statsOverview.innerHTML = this.renderFileSizeCards(fileSizeStats);
        }
        
        // Update histogram
        const histogramContainer = sessionContent.querySelector('#file-size-histogram');
        if (histogramContainer) {
            histogramContainer.innerHTML = createHistogram(fileSizeStats.histogram);
        }
        
        // Update extension breakdown
        const extensionContainer = sessionContent.querySelector('.file-size-section .chart-container:nth-of-type(3)');
        if (extensionContainer) {
            const h3 = extensionContainer.querySelector('h3');
            extensionContainer.innerHTML = '';
            if (h3) extensionContainer.appendChild(h3);
            extensionContainer.insertAdjacentHTML('beforeend', this.renderExtensionBreakdown(fileSizeStats.byExtension));
        }
        
        // Re-initialize chart tooltips after update
        initializeChartTooltips();
    }
    
    setupDuplicationHandlers() {
        const sessionContent = this.sessionContainer.querySelector('#session-stats-content');
        if (!sessionContent) return;
        
        // Update layout class based on drill-down state
        const contentLayout = sessionContent.querySelector('.duplication-content-layout');
        if (contentLayout) {
            if (this.selectedDuplicateHash) {
                contentLayout.classList.add('has-drill-down');
            } else {
                contentLayout.classList.remove('has-drill-down');
            }
        }
        
        // Export button handlers
        const exportCsvBtn = sessionContent.querySelector('[data-action="export-duplication-csv"]');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportDuplicationCSV());
        }
        
        const exportXmlBtn = sessionContent.querySelector('[data-action="export-duplication-xml"]');
        if (exportXmlBtn) {
            exportXmlBtn.addEventListener('click', () => this.exportDuplicationXML());
        }
        
        // Table sorting handlers
        sessionContent.querySelectorAll('.duplication-table th.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = e.currentTarget.dataset.sort;
                this.handleDuplicationSort(sortField);
            });
        });
        
        // File name hover handlers (preview file) in the table
        sessionContent.querySelectorAll('.duplication-table .hoverable-file').forEach(fileEl => {
            fileEl.addEventListener('mouseenter', (e) => {
                const modId = e.currentTarget.dataset.modId;
                const filePath = e.currentTarget.dataset.filePath;
                this.showDuplicationFilePreview(modId, filePath, e.currentTarget);
            });
            
            fileEl.addEventListener('mouseleave', () => {
                this.hidePreview();
            });
        });
        
        // Load actual preview thumbnails
        sessionContent.querySelectorAll('.file-preview-thumb').forEach(async (thumbEl) => {
            const modId = thumbEl.dataset.modId;
            const filePath = thumbEl.dataset.filePath;
            const type = thumbEl.dataset.type;
            const thumbKey = `${modId}:${filePath}`;
            
            // Check if this element already has loaded content (img or audio tag)
            const hasLoadedContent = thumbEl.querySelector('img, audio');
            
            // Only load if element doesn't have content yet
            if (!hasLoadedContent) {
                await this.loadThumbnail(thumbEl, modId, filePath, type);
                this.loadedThumbnails.add(thumbKey);
            }
        });
        
        // Setup column resizing
        this.setupColumnResizing(sessionContent);
        
        // Row click handlers (drill-down)
        sessionContent.querySelectorAll('.duplicate-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const hash = e.currentTarget.dataset.hash;
                this.handleDuplicateRowClick(hash);
            });
        });
        
        // Close drill-down handler
        const closeBtn = sessionContent.querySelector('[data-action="close-drill-down"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.selectedDuplicateHash = null;
                this.render();
            });
        }
        
        // Mod name click handlers (select mod but stay on statistics tab)
        sessionContent.querySelectorAll('.location-item .mod-name').forEach(modNameEl => {
            modNameEl.addEventListener('click', (e) => {
                const modId = e.currentTarget.dataset.modId;
                this.handleModSelection(modId);
            });
        });
    }
    
    handleDuplicationSort(field) {
        // Map UI field names to tracker sort options
        const sortMap = {
            'count': 'count',
            'size': 'size',
            'impact': 'impact',
            'path': 'impact' // Default to impact for path sort
        };
        
        const newSortBy = sortMap[field] || 'impact';
        
        // Toggle direction if clicking the same column
        if (this.currentSortBy === newSortBy) {
            this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            // New column, default to descending
            this.currentSortBy = newSortBy;
            this.sortDirection = 'desc';
        }
        
        // Clear thumbnails on sort change since table will re-render
        this.loadedThumbnails.clear();
        
        this.render();
    }
    
    handleDuplicateRowClick(hash) {
        // Toggle selection state
        const wasSelected = this.selectedDuplicateHash === hash;
        const oldHash = this.selectedDuplicateHash;
        
        if (wasSelected) {
            this.selectedDuplicateHash = null;
        } else {
            this.selectedDuplicateHash = hash;
        }
        
        // Update DOM directly instead of full re-render
        const container = this.sessionContainer || this.container;
        if (!container) return;
        
        // Remove selected class from previously selected row
        if (oldHash) {
            const oldRow = container.querySelector(`[data-hash="${oldHash}"]`);
            if (oldRow) {
                oldRow.classList.remove('selected');
            }
        }
        
        // Add selected class to newly selected row (unless we're deselecting)
        if (!wasSelected && hash) {
            const newRow = container.querySelector(`[data-hash="${hash}"]`);
            if (newRow) {
                newRow.classList.add('selected');
            }
        }
        
        // Update drill-down panel
        const duplicationContent = container.querySelector('.duplication-content-layout');
        if (duplicationContent) {
            // Check if drill-down already exists
            const existingDrillDown = duplicationContent.querySelector('.drill-down-panel');
            
            if (this.selectedDuplicateHash) {
                // Add or update drill-down
                const drillDownHtml = this.renderFileDrillDown(this.selectedDuplicateHash);
                if (existingDrillDown) {
                    existingDrillDown.outerHTML = drillDownHtml;
                } else {
                    duplicationContent.insertAdjacentHTML('beforeend', drillDownHtml);
                    duplicationContent.classList.add('has-drill-down');
                }
                
                // Setup event handlers for the new drill-down
                this.setupDrillDownHandlers(duplicationContent);
            } else {
                // Remove drill-down
                if (existingDrillDown) {
                    existingDrillDown.remove();
                    duplicationContent.classList.remove('has-drill-down');
                }
            }
        }
    }
    
    setupDrillDownHandlers(container) {
        // Close drill-down handler
        const closeBtn = container.querySelector('[data-action="close-drill-down"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.selectedDuplicateHash = null;
                this.handleDuplicateRowClick(null); // Trigger removal
            });
        }
        
        // Mod name click handlers (select mod but stay on statistics tab)
        container.querySelectorAll('.location-item .mod-name').forEach(modNameEl => {
            modNameEl.addEventListener('click', (e) => {
                const modId = e.currentTarget.dataset.modId;
                this.handleModSelection(modId);
            });
        });
    }
    
    setupColumnResizing(container) {
        const table = container.querySelector('.duplication-table');
        if (!table) return;
        
        const colgroup = table.querySelector('colgroup');
        const cols = Array.from(colgroup.querySelectorAll('col'));
        const headers = Array.from(table.querySelectorAll('th'));
        
        headers.forEach((header, colIndex) => {
            // Skip the last column (no resize needed)
            if (colIndex === headers.length - 1) return;
            
            // Remove any existing resizer to prevent duplicates
            const existingResizer = header.querySelector('.column-resizer');
            if (existingResizer) {
                existingResizer.remove();
            }
            
            const resizer = document.createElement('div');
            resizer.className = 'column-resizer';
            header.appendChild(resizer);
            
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startX = e.clientX;
                const col = cols[colIndex];
                const nextCol = cols[colIndex + 1];
                const startWidth = header.offsetWidth;
                const nextHeader = headers[colIndex + 1];
                const nextStartWidth = nextHeader ? nextHeader.offsetWidth : 0;
                const minWidth = 50;
                
                // Add visual feedback
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'col-resize';
                resizer.classList.add('active');
                table.style.pointerEvents = 'none';
                
                const onMouseMove = (e) => {
                    e.preventDefault();
                    const deltaX = e.clientX - startX;
                    const newWidth = Math.max(minWidth, startWidth + deltaX);
                    const newNextWidth = Math.max(minWidth, nextStartWidth - deltaX);
                    
                    const tableWidth = table.offsetWidth;
                    
                    // Check if column should stay at fixed pixel width (preview column)
                    const isFixedWidth = col.style.width.includes('px') && !col.style.width.includes('%');
                    const isNextFixedWidth = nextCol && nextCol.style.width.includes('px') && !nextCol.style.width.includes('%');
                    
                    // Update current column
                    if (isFixedWidth) {
                        col.style.width = newWidth + 'px';
                    } else {
                        const widthPercent = (newWidth / tableWidth) * 100;
                        col.style.width = `${widthPercent}%`;
                    }
                    
                    // Update next column
                    if (nextCol) {
                        if (isNextFixedWidth) {
                            nextCol.style.width = newNextWidth + 'px';
                        } else {
                            const nextWidthPercent = (newNextWidth / tableWidth) * 100;
                            nextCol.style.width = `${nextWidthPercent}%`;
                        }
                    }
                };
                
                const onMouseUp = () => {
                    // Restore defaults
                    document.body.style.userSelect = '';
                    document.body.style.cursor = '';
                    resizer.classList.remove('active');
                    table.style.pointerEvents = '';
                    
                    // Clean up event listeners
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }
    
    handleModSelection(modId) {
        // Find the mod index in the session
        const modIndex = this.sessionMods.findIndex(mod => mod.id == modId);
        if (modIndex !== -1) {
            // Get the app instance (assuming we can access parent)
            const app = window.app || document.querySelector('#app')?.__app;
            if (app && app.selectMod) {
                app.selectMod(modIndex);
            }
        }
    }
    
    async loadThumbnail(element, modId, filePath, type) {
        const mod = this.sessionMods.find(m => m.id == modId);
        if (!mod || !mod.zipArchive) return;
        
        try {
            const fileEntry = mod.zipArchive.file(filePath);
            if (!fileEntry) return;
            
            if (type === 'image') {
                const blob = await fileEntry.async('blob');
                const url = URL.createObjectURL(blob);
                element.innerHTML = `<img src="${url}" alt="" />`;
            } else if (type === 'audio') {
                // Create audio element for playback
                const blob = await fileEntry.async('blob');
                const url = URL.createObjectURL(blob);
                const audioId = 'audio_' + Math.random().toString(36).substr(2, 9);
                element.innerHTML = `
                    <audio id="${audioId}" src="${url}" style="display: none;"></audio>
                    <span class="audio-icon">🔊</span>
                `;
                
                // Add click handler to play/pause
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const audio = element.querySelector('audio');
                    if (audio.paused) {
                        // Pause any other playing audio and remove their playing state
                        document.querySelectorAll('.duplication-table audio').forEach(a => {
                            if (a !== audio) {
                                a.pause();
                                // Remove playing class from the parent element
                                a.closest('.file-preview-thumb')?.classList.remove('playing');
                            }
                        });
                        audio.play();
                        element.classList.add('playing');
                    } else {
                        audio.pause();
                        element.classList.remove('playing');
                    }
                });
                
                // Update icon when audio ends or is paused
                const audio = element.querySelector('audio');
                audio.addEventListener('ended', () => {
                    element.classList.remove('playing');
                });
                audio.addEventListener('pause', () => {
                    element.classList.remove('playing');
                });
            }
        } catch (error) {
            console.error('Failed to load thumbnail:', error);
        }
    }
    
    async showDuplicationFilePreview(modId, filePath, targetElement) {
        // Find the mod
        const mod = this.sessionMods.find(m => m.id == modId);
        if (!mod || !mod.zipArchive) {
            return;
        }
        
        // Set the zipArchive for the mixin to use
        this.zipArchive = mod.zipArchive;
        
        try {
            // Get file from zip
            const fileEntry = mod.zipArchive.file(filePath);
            if (!fileEntry) {
                return;
            }
            
            const ext = filePath.split('.').pop().toLowerCase();
            let previewHtml;
            
            // Render based on file type (same logic as FilePreviewMixin)
            if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
                previewHtml = await this.renderImagePreview(fileEntry, filePath);
            } else if (['ogg', 'wav', 'mp3'].includes(ext)) {
                previewHtml = await this.renderAudioPreview(fileEntry, filePath);
            } else if (['lua', 'txt', 'md', 'json', 'xml', 'animation'].includes(ext)) {
                previewHtml = await this.renderTextPreview(fileEntry, filePath, ext);
            } else {
                previewHtml = this.renderBinaryPreview(fileEntry, filePath);
            }
            
            // Use the mixin's showTooltip method
            this.showTooltip(targetElement, previewHtml);
            
        } catch (error) {
            console.error('Failed to preview file:', error);
        }
    }
    
    renderFileSizeSection(stats) {
        if (!this.duplicationTracker) {
            return '';
        }
        
        // Get files with metadata from the tracker
        const files = this.duplicationTracker.getFilesWithMetadata();
        
        if (files.length === 0) {
            return `
                <div class="stats-section">
                    <h2>File Size Analysis</h2>
                    <div class="empty-state">
                        No file data available for analysis.
                    </div>
                </div>
            `;
        }
        
        // Create category map from session mods
        const categoryMap = {};
        this.sessionMods.forEach(mod => {
            if (mod.parsed && mod.parsed.category) {
                categoryMap[mod.id] = mod.parsed.category;
            }
        });
        
        // Calculate file size statistics
        const fileSizeStats = calculateFileSizeStatistics(files, categoryMap);
        
        // Get unique categories for filter dropdown
        const categories = [...new Set(Object.values(categoryMap))].sort();
        
        return `
            <div class="stats-section file-size-section" id="file-size-section">
                <h2>File Size Analysis</h2>
                
                <div class="file-size-controls">
                    <label for="file-size-category-filter">Filter by Category:</label>
                    <select id="file-size-category-filter">
                        <option value="">All Categories</option>
                        ${categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
                    </select>
                </div>
                
                <div class="stats-overview">
                    ${this.renderFileSizeCards(fileSizeStats)}
                </div>
                
                <div class="file-size-split-layout">
                    <div class="chart-container">
                        <h3>File Size Distribution</h3>
                        <div id="file-size-histogram">
                            ${createHistogram(fileSizeStats.histogram)}
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Size by File Extension</h3>
                        ${this.renderExtensionBreakdown(fileSizeStats.byExtension)}
                    </div>
                </div>
                
                ${fileSizeStats.byCategory.length > 1 ? `
                    <div class="chart-container full-width">
                        <h3>Median File Size by Category</h3>
                        ${this.renderCategoryComparison(fileSizeStats.byCategory)}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderFileSizeCards(fileSizeStats) {
        const card = (title, value, subtitle = '') => `
            <div class="stat-card">
                <h3>${title}</h3>
                <div class="stat-value">${value}</div>
                ${subtitle ? `<div class="stat-subtitle">${subtitle}</div>` : ''}
            </div>
        `;
        
        const modeText = fileSizeStats.modStats.mode 
            ? `${fileSizeStats.modStats.mode.label}`
            : 'N/A';
        
        const modeMidpoint = fileSizeStats.modStats.mode
            ? `~${formatBytes(fileSizeStats.modStats.mode.midpoint)}`
            : '';
        
        return `
            <div class="stats-grid">
                ${card('Total Mods', fileSizeStats.modStats.totalMods.toLocaleString(), `${fileSizeStats.totalFiles.toLocaleString()} files`)}
                ${card('Total Size', formatBytes(fileSizeStats.totalSize))}
                ${card('Median Mod Size', formatBytes(fileSizeStats.modStats.median))}
                ${card('Mean Mod Size', formatBytes(fileSizeStats.modStats.mean))}
                ${card('Most Common Range', modeText, modeMidpoint)}
            </div>
        `;
    }
    
    renderExtensionBreakdown(byExtension) {
        if (byExtension.length === 0) {
            return '<div class="empty-state">No extension data available</div>';
        }
        
        // Show top 10 extensions by default
        const displayLimit = 10;
        const displayItems = byExtension.slice(0, displayLimit);
        const hasMore = byExtension.length > displayLimit;
        
        const rows = displayItems.map((ext, index) => `
            <tr class="${index < 5 ? 'highlighted' : ''}">
                <td>${escapeHtml(ext.extension || '(no extension)')}</td>
                <td>${formatBytes(ext.totalSize)}</td>
                <td>${ext.count.toLocaleString()}</td>
                <td>${ext.percentage.toFixed(1)}%</td>
            </tr>
        `).join('');
        
        return `
            <table class="extension-table">
                <thead>
                    <tr>
                        <th>Extension</th>
                        <th>Total Size</th>
                        <th>File Count</th>
                        <th>% of Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            ${hasMore ? `<div class="table-footer">Showing top ${displayLimit} of ${byExtension.length} extensions</div>` : ''}
        `;
    }
    
    renderCategoryComparison(byCategory) {
        if (byCategory.length === 0) {
            return '<div class="empty-state">No category data available</div>';
        }
        
        const maxMedian = Math.max(...byCategory.map(c => c.median));
        
        const bars = byCategory.map(cat => {
            const percent = maxMedian > 0 ? (cat.median / maxMedian * 100) : 0;
            
            return `
                <div class="bar-item">
                    <div class="bar-label" title="${escapeHtml(cat.category)} - ${cat.count} files">${escapeHtml(cat.category)}</div>
                    <div class="bar-visual">
                        <div class="bar-fill" style="width: ${percent}%; background: var(--primary-color)"></div>
                        <span class="bar-count">${formatBytes(cat.median)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        return `<div class="bar-chart">${bars}</div>`;
    }
    
    renderDuplicationReport() {
        if (!this.duplicationTracker) {
            return '';
        }
        
        // Check if we have enough mods for duplication analysis
        if (this.sessionMods.length < 2) {
            return `
                <div class="stats-section">
                    <h2>File Duplication Analysis</h2>
                    <div class="empty-state">
                        Process multiple mods to see duplication analysis. 
                        This feature identifies identical files shared across different mods.
                    </div>
                </div>
            `;        }
        
        const metrics = this.duplicationTracker.getMetrics();
        const duplicatedFiles = this.duplicationTracker.getDuplicatedFiles(this.currentSortBy, this.sortDirection);
        
        // Check if any duplicates found
        if (duplicatedFiles.length === 0) {
            return `
                <div class="stats-section">
                    <h2>File Duplication Analysis</h2>
                    <div class="empty-state">
                        No duplicate files found across ${this.sessionMods.length} mods.
                        All files are unique!
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stats-section duplication-section">
                <div class="duplication-header">
                    <h2>File Duplication Analysis</h2>
                    <div class="duplication-actions">
                        <button class="btn btn-secondary" data-action="export-duplication-csv">Export CSV</button>
                        <button class="btn btn-secondary" data-action="export-duplication-xml">Export XML</button>
                    </div>
                </div>
                ${this.renderDuplicationMetrics(metrics)}
                <div class="duplication-content-layout">
                    ${this.renderDuplicatedFilesTable(duplicatedFiles, metrics)}
                    ${this.selectedDuplicateHash ? this.renderFileDrillDown(this.selectedDuplicateHash) : ''}
                </div>
            </div>
        `;
    }
    
    renderDuplicationMetrics(metrics) {
        const card = (title, value, subtitle = '') => `
            <div class="stat-card">
                <h3>${title}</h3>
                <div class="stat-value">${value}</div>
                ${subtitle ? `<div class="stat-subtitle">${subtitle}</div>` : ''}
            </div>
        `;
        
        return `
            <div class="stats-overview duplication-metrics">
                ${card(
                    'Total Duplicated',
                    formatBytes(metrics.totalDuplicatedBytes),
                    'across all occurrences'
                )}
                ${card(
                    'Potential Savings',
                    formatBytes(metrics.potentialSavings),
                    'if deduplicated'
                )}
                ${card(
                    'Duplication Rate',
                    `${metrics.duplicationRate.toFixed(1)}%`,
                    `${metrics.duplicatedFiles} of ${metrics.uniqueFiles} files`
                )}
                ${card(
                    'Top Duplicate',
                    this.getTopDuplicateInfo(metrics),
                    ''
                )}
            </div>
        `;
    }
    
    getTopDuplicateInfo(metrics) {
        const duplicatedFiles = this.duplicationTracker.getDuplicatedFiles('impact');
        if (duplicatedFiles.length === 0) return 'None';
        
        const top = duplicatedFiles[0];
        const basename = top.locations[0].filePath.split('/').pop();
        return `${basename} (${top.locations.length}×)`;
    }
    
    renderDuplicatedFilesTable(files, metrics) {
        const maxDisplay = 50;
        const displayFiles = files.slice(0, maxDisplay);
        
        // Column definitions - single source of truth
        const columns = [
            {
                key: 'filepath',
                header: 'File Path',
                width: '35%',
                sortable: true,
                sortField: 'path',
                render: (fileInfo) => {
                    const basename = fileInfo.locations[0].filePath.split('/').pop();
                    const fullPath = fileInfo.locations[0].filePath;
                    const ext = basename.split('.').pop().toLowerCase();
                    const hasPreview = ['png', 'jpg', 'jpeg', 'gif', 'ogg', 'wav', 'mp3'].includes(ext);
                    const hoverableClass = hasPreview ? '' : 'hoverable-file';
                    const firstLocation = fileInfo.locations[0];
                    
                    return `
                        <td class="file-path" title="${escapeHtml(fullPath)}">
                            <span class="basename ${hoverableClass}" 
                                  data-mod-id="${firstLocation.modId}" 
                                  data-file-path="${escapeHtml(fullPath)}">${escapeHtml(basename)}</span>
                            <span class="filepath-detail">${escapeHtml(fullPath)}</span>
                        </td>
                    `;
                }
            },
            {
                key: 'preview',
                header: 'Preview',
                width: '15%',
                sortable: false,
                headerClass: 'preview-header',
                render: (fileInfo) => {
                    const basename = fileInfo.locations[0].filePath.split('/').pop();
                    const fullPath = fileInfo.locations[0].filePath;
                    const ext = basename.split('.').pop().toLowerCase();
                    const firstLocation = fileInfo.locations[0];
                    
                    let content = '';
                    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
                        content = `<div class="file-preview-thumb" 
                                       data-type="image" 
                                       data-mod-id="${firstLocation.modId}" 
                                       data-file-path="${escapeHtml(fullPath)}">🖼️</div>`;
                    } else if (['ogg', 'wav', 'mp3'].includes(ext)) {
                        content = `<div class="file-preview-thumb audio-preview" 
                                       data-type="audio" 
                                       data-mod-id="${firstLocation.modId}" 
                                       data-file-path="${escapeHtml(fullPath)}" 
                                       title="Click to play/pause">🔊</div>`;
                    }
                    
                    return `<td class="preview-cell">${content}</td>`;
                }
            },
            {
                key: 'count',
                header: 'Occurrences',
                width: '15%',
                sortable: true,
                sortField: 'count',
                render: (fileInfo) => `<td class="count">${fileInfo.locations.length}</td>`
            },
            {
                key: 'size',
                header: 'Size',
                width: '15%',
                sortable: true,
                sortField: 'size',
                render: (fileInfo) => `<td class="size">${formatBytes(fileInfo.size)}</td>`
            },
            {
                key: 'impact',
                header: 'Total Impact',
                width: '20%',
                sortable: true,
                sortField: 'impact',
                render: (fileInfo) => {
                    const impact = fileInfo.locations.length * fileInfo.size;
                    return `<td class="impact">${formatBytes(impact)}</td>`;
                }
            }
        ];
        
        // Generate sort indicator
        const sortIcon = (field) => {
            if (this.currentSortBy === field) {
                return this.sortDirection === 'desc' 
                    ? ' <span class="sort-indicator">▼</span>' 
                    : ' <span class="sort-indicator">▲</span>';
            }
            return '';
        };
        
        // Generate table header
        const colgroup = columns.map(col => 
            `<col class="col-${col.key}" style="width: ${col.width};">`
        ).join('');
        
        const headerRow = columns.map((col, index) => {
            const sortableClass = col.sortable ? 'sortable' : '';
            const headerClass = col.headerClass || '';
            const sortAttr = col.sortable ? `data-sort="${col.sortField}"` : '';
            const icon = col.sortable ? sortIcon(col.sortField) : '';
            
            return `<th class="${sortableClass} ${headerClass}" ${sortAttr} data-col-index="${index}">${col.header}${icon}</th>`;
        }).join('');
        
        // Generate table rows
        const rows = displayFiles.map(fileInfo => {
            const isSelected = this.selectedDuplicateHash === fileInfo.hash;
            const cells = columns.map(col => col.render(fileInfo)).join('');
            
            return `
                <tr class="duplicate-row ${isSelected ? 'selected' : ''}" data-hash="${fileInfo.hash}">
                    ${cells}
                </tr>
            `;
        }).join('');
        
        const showingText = files.length > maxDisplay 
            ? `<p class="table-info">Showing top ${maxDisplay} of ${files.length} duplicated files</p>`
            : `<p class="table-info">Showing all ${files.length} duplicated files</p>`;
        
        return `
            <div class="duplication-table-container">
                ${showingText}
                <table class="duplication-table">
                    <colgroup>
                        ${colgroup}
                    </colgroup>
                    <thead>
                        <tr>
                            ${headerRow}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderFileDrillDown(hash) {
        const fileInfo = this.duplicationTracker.getFileDetails(hash);
        if (!fileInfo) return '';
        
        const basename = fileInfo.locations[0].filePath.split('/').pop();
        
        // Sort locations by date (earliest first), then by mod name
        // Use the newer of modDate or fileDate for sorting and display
        const sortedLocations = [...fileInfo.locations].sort((a, b) => {
            const dateA = (a.fileDate && a.modDate && a.fileDate > a.modDate) ? a.fileDate : a.modDate;
            const dateB = (b.fileDate && b.modDate && b.fileDate > b.modDate) ? b.fileDate : b.modDate;
            
            // Both have dates - compare them
            if (dateA && dateB) {
                return dateA - dateB;
            }
            // a has date, b doesn't - a comes first
            if (dateA && !dateB) return -1;
            // b has date, a doesn't - b comes first
            if (!dateA && dateB) return 1;
            // Neither has date - sort by mod name
            return a.modName.localeCompare(b.modName);
        });
        
        const locationsList = sortedLocations.map(loc => {
            let dateInfo = '';
            // Use the newer of fileDate or modDate for display
            const displayDate = (loc.fileDate && loc.modDate && loc.fileDate > loc.modDate) ? loc.fileDate : loc.modDate;
            
            if (displayDate) {
                const dateStr = displayDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                dateInfo = `<span class="location-date">${dateStr}</span>`;
            }
            
            return `
                <li class="location-item">
                    <span class="mod-name" data-mod-id="${loc.modId}" title="Click to select this mod">${escapeHtml(loc.modName)}</span>
                    ${dateInfo}
                    <span class="file-path" title="${escapeHtml(loc.filePath)}">${escapeHtml(loc.filePath)}</span>
                </li>
            `;
        }).join('');
        
        return `
            <div class="drill-down-panel">
                <div class="drill-down-header">
                    <h3>Duplicate File Details</h3>
                    <button class="close-drill-down" data-action="close-drill-down">✕</button>
                </div>
                <div class="drill-down-content">
                    <div class="file-info">
                        <div><strong>File:</strong> ${escapeHtml(basename)}</div>
                        <div><strong>Size:</strong> ${formatBytes(fileInfo.size)}</div>
                        <div><strong>Hash:</strong> <code>${fileInfo.hash.substring(0, 16)}...</code></div>
                        <div><strong>Occurrences:</strong> ${fileInfo.locations.length}</div>
                    </div>
                    <div class="locations">
                        <h4>Found in these mods (chronologically):</h4>
                        <ul class="locations-list">
                            ${locationsList}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    exportDuplicationCSV() {
        if (!this.duplicationTracker) return;
        
        const csv = exportDuplicationCSV(this.duplicationTracker);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `duplication-report-${timestamp}.csv`;
        this.downloadFile(filename, csv, 'text/csv');
    }
    
    exportDuplicationXML() {
        if (!this.duplicationTracker) return;
        
        const xml = exportDuplicationXML(this.duplicationTracker);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `duplication-report-${timestamp}.xml`;
        this.downloadFile(filename, xml, 'application/xml');
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
