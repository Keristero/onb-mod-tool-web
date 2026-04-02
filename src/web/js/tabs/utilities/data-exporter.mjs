// Data Export Utilities - CSV and XML formatting for statistics

import { escapeXml } from '../../utils/html-utils.mjs';

/**
 * Escapes CSV cell content (handles quotes and commas)
 * @param {*} cell - Cell value to escape
 * @returns {string} Escaped cell value wrapped in quotes
 */
function escapeCsvCell(cell) {
    return `"${String(cell).replace(/"/g, '""')}"`;
}

/**
 * Exports mod statistics to CSV format
 * @param {Object} stats - Statistics object (not used directly, mods contain the data)
 * @param {Array<Object>} mods - Array of mod objects to export
 * @param {string} mode - Export mode: 'file' or 'session'
 * @returns {string} CSV formatted string
 */
export function exportToCSV(stats, mods, mode) {
    // Updated headers to include all 4 error categories and warnings
    const headers = [
        'Filename',
        'Status',
        'Category',
        'Validation Errors',
        'Analyzer Errors',
        'Stderr Errors',
        'Warnings',
        'Other Errors',
        'Processing Time (ms)',
        'Size (bytes)',
        'Validation Error Details',
        'Most Common Warning',
        'Timestamp'
    ];
    
    const rows = mods.map(mod => {
        // Use pre-categorized errors (consistent with UI)
        const validationErrors = mod.errorCategories?.validation?.length || 0;
        const analyzerErrors = mod.errorCategories?.analyzer?.length || 0;
        const stderrErrors = mod.errorCategories?.stderr?.length || 0;
        const warnings = mod.errorCategories?.warnings?.length || 0;
        const otherErrors = mod.errorCategories?.other?.length || 0;
        
        // Detailed validation error messages
        const validationDetails = mod.errorCategories?.validation
            ?.map(e => `${e.field}: ${e.message}`)
            .join('; ') || '';
        
        // Get most common warning
        const mostCommonWarning = mod.errorCategories?.warnings?.[0]?.message || '';
        
        return [
            mod.fileName,
            mod.status,
            mod.parsed?.category || '',
            validationErrors,
            analyzerErrors,
            stderrErrors,
            warnings,
            otherErrors,
            mod.processingTime || 0,
            mod.fileSize || 0,
            validationDetails,
            mostCommonWarning,
            mod.timestamp || ''
        ];
    });
    
    // Build CSV with proper escaping
    const csv = [headers, ...rows]
        .map(row => row.map(escapeCsvCell).join(','))
        .join('\n');
    
    return csv;
}

/**
 * Exports mod statistics to XML format
 * @param {Object} stats - Statistics object with aggregated data
 * @param {Array<Object>} mods - Array of mod objects to export
 * @param {string} mode - Export mode: 'file' or 'session'
 * @returns {string} XML formatted string
 */
export function exportToXML(stats, mods, mode) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<modStatistics>
    <summary>
        <total>${stats.total}</total>
        <successful>${stats.successful}</successful>
        <successWithWarnings>${stats.successWithWarnings || 0}</successWithWarnings>
        <validationFailed>${stats.validationFailed || 0}</validationFailed>
        <failed>${stats.failed}</failed>
        <successRate>${stats.successRate}</successRate>
        <validationSuccessRate>${stats.validationSuccessRate}</validationSuccessRate>
        <validWithWarningsRate>${stats.validWithWarningsRate || 0}</validWithWarningsRate>
        <avgProcessingTime>${stats.avgTime}</avgProcessingTime>
        <totalErrors>${stats.totalErrors}</totalErrors>
        <totalWarnings>${stats.totalWarnings || 0}</totalWarnings>
        <validationErrors>${stats.validationErrors}</validationErrors>
        <analyzerErrors>${stats.analyzerErrors}</analyzerErrors>
        <stderrErrors>${stats.stderrErrors}</stderrErrors>
        <stderrWarnings>${stats.stderrWarnings || 0}</stderrWarnings>
        <otherErrors>${stats.otherErrors}</otherErrors>
    </summary>
    <mods>
        ${mods.map(mod => {
            // Use pre-categorized errors (consistent with UI)
            const validationErrors = mod.errorCategories?.validation || [];
            const analyzerErrors = mod.errorCategories?.analyzer || [];
            const stderrErrors = mod.errorCategories?.stderr || [];
            const warnings = mod.errorCategories?.warnings || [];
            const otherErrors = mod.errorCategories?.other || [];
            
            return `
        <mod>
            <filename>${escapeXml(mod.fileName)}</filename>
            <status>${escapeXml(mod.status)}</status>
            <category>${escapeXml(mod.parsed?.category || '')}</category>
            <processingTime>${mod.processingTime || 0}</processingTime>
            <size>${mod.fileSize || 0}</size>
            <validationErrors count="${validationErrors.length}">
                ${validationErrors.map(e => `
                <error field="${escapeXml(e.field)}">${escapeXml(e.message)}</error>
                `).join('')}
            </validationErrors>
            <analyzerErrors count="${analyzerErrors.length}">
                ${analyzerErrors.map(e => `
                <error>${escapeXml(e.message || e.error || '')}</error>
                `).join('')}
            </analyzerErrors>
            <stderrErrors count="${stderrErrors.length}">
                ${stderrErrors.map(e => `
                <error>${escapeXml(e.message || e.line || '')}</error>
                `).join('')}
            </stderrErrors>
            <warnings count="${warnings.length}">
                ${warnings.map(w => `
                <warning>${escapeXml(w.message || w.line || '')}</warning>
                `).join('')}
            </warnings>
            <otherErrors count="${otherErrors.length}">
                ${otherErrors.map(e => `
                <error>${escapeXml(e.message || e.error || '')}</error>
                `).join('')}
            </otherErrors>
        </mod>
            `;
        }).join('')}
    </mods>
</modStatistics>`;
    
    return xml;
}

/**
 * Exports duplication data to CSV format
 * @param {DuplicationTracker} tracker - DuplicationTracker instance
 * @returns {string} CSV formatted string
 */
export function exportDuplicationCSV(tracker) {
    const headers = [
        'File Path',
        'Hash',
        'Size (bytes)',
        'Occurrences',
        'Total Impact (bytes)',
        'Mods'
    ];
    
    const duplicatedFiles = tracker.getDuplicatedFiles('impact');
    
    const rows = duplicatedFiles.map(fileInfo => {
        const filePath = fileInfo.locations[0].filePath;
        const hash = fileInfo.hash;
        const size = fileInfo.size;
        const occurrences = fileInfo.locations.length;
        const totalImpact = size * occurrences;
        const modList = fileInfo.locations.map(loc => loc.modName).join(', ');
        
        return [
            escapeCsvCell(filePath),
            escapeCsvCell(hash),
            size,
            occurrences,
            totalImpact,
            escapeCsvCell(modList)
        ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Exports duplication data to XML format
 * @param {DuplicationTracker} tracker - DuplicationTracker instance
 * @returns {string} XML formatted string
 */
export function exportDuplicationXML(tracker) {
    const metrics = tracker.getMetrics();
    const duplicatedFiles = tracker.getDuplicatedFiles('impact');
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<duplicationReport>
    <summary>
        <totalDuplicatedBytes>${metrics.totalDuplicatedBytes}</totalDuplicatedBytes>
        <potentialSavings>${metrics.potentialSavings}</potentialSavings>
        <duplicationRate>${metrics.duplicationRate.toFixed(2)}%</duplicationRate>
        <uniqueFiles>${metrics.uniqueFiles}</uniqueFiles>
        <duplicatedFiles>${metrics.duplicatedFiles}</duplicatedFiles>
    </summary>
    <files>
        ${duplicatedFiles.map(fileInfo => `
        <file>
            <path>${escapeXml(fileInfo.locations[0].filePath)}</path>
            <hash>${escapeXml(fileInfo.hash)}</hash>
            <size>${fileInfo.size}</size>
            <occurrences>${fileInfo.locations.length}</occurrences>
            <totalImpact>${fileInfo.size * fileInfo.locations.length}</totalImpact>
            <locations>
                ${fileInfo.locations.map(loc => `
                <location>
                    <mod>${escapeXml(loc.modName)}</mod>
                    <path>${escapeXml(loc.filePath)}</path>
                </location>
                `).join('')}
            </locations>
        </file>
        `).join('')}
    </files>
</duplicationReport>`;
    
    return xml;
}
