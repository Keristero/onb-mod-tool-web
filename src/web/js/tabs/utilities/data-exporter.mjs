// Data Export Utilities - CSV and XML formatting for statistics

/**
 * Escapes HTML/XML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

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
    // Updated headers to include all 4 error categories
    const headers = [
        'Filename',
        'Status',
        'Category',
        'Validation Errors',
        'Analyzer Errors',
        'Stderr Errors',
        'Other Errors',
        'Processing Time (ms)',
        'Size (bytes)',
        'Validation Error Details',
        'Timestamp'
    ];
    
    const rows = mods.map(mod => {
        // Use pre-categorized errors (consistent with UI)
        const validationErrors = mod.errorCategories?.validation?.length || 0;
        const analyzerErrors = mod.errorCategories?.analyzer?.length || 0;
        const stderrErrors = mod.errorCategories?.stderr?.length || 0;
        const otherErrors = mod.errorCategories?.other?.length || 0;
        
        // Detailed validation error messages
        const validationDetails = mod.errorCategories?.validation
            ?.map(e => `${e.field}: ${e.message}`)
            .join('; ') || '';
        
        return [
            mod.fileName,
            mod.status,
            mod.parsed?.category || '',
            validationErrors,
            analyzerErrors,
            stderrErrors,
            otherErrors,
            mod.processingTime || 0,
            mod.fileSize || 0,
            validationDetails,
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
        <validationFailed>${stats.validationFailed || 0}</validationFailed>
        <failed>${stats.failed}</failed>
        <successRate>${stats.successRate}</successRate>
        <validationSuccessRate>${stats.validationSuccessRate}</validationSuccessRate>
        <avgProcessingTime>${stats.avgTime}</avgProcessingTime>
        <totalErrors>${stats.totalErrors}</totalErrors>
        <validationErrors>${stats.validationErrors}</validationErrors>
        <analyzerErrors>${stats.analyzerErrors}</analyzerErrors>
        <stderrErrors>${stats.stderrErrors}</stderrErrors>
        <otherErrors>${stats.otherErrors}</otherErrors>
    </summary>
    <mods>
        ${mods.map(mod => {
            // Use pre-categorized errors (consistent with UI)
            const validationErrors = mod.errorCategories?.validation || [];
            const analyzerErrors = mod.errorCategories?.analyzer || [];
            const stderrErrors = mod.errorCategories?.stderr || [];
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
