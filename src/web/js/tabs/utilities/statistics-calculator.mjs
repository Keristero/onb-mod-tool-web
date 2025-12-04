// Statistics Calculation Utilities - Pure calculation logic for mod statistics

import * as parser from '../../parser.mjs';

/**
 * Calculates comprehensive statistics for one or more mods
 * @param {Object|Array<Object>} mods - Single mod object or array of mod objects
 * @param {Object} options - Calculation options (currently unused, reserved for future)
 * @returns {Object} Statistics object with aggregated data
 */
export function calculateStatistics(mods, options = {}) {
    // Normalize input: ensure mods is always an array
    const modArray = Array.isArray(mods) ? mods : [mods];
    
    const total = modArray.length;
    const successful = modArray.filter(m => m.status === 'success').length;
    const validationFailed = modArray.filter(m => m.status === 'validation-failed').length;
    const failed = modArray.filter(m => m.status === 'failed').length;
    
    // Processing time statistics
    const processingTimes = modArray
        .filter(m => m.processingTime)
        .map(m => m.processingTime);
    
    const avgTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
    
    const minTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
    const maxTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
    
    // Initialize error tracking objects
    const errorTypes = {};
    const stderrMessages = {};
    const validationMessages = {};
    const analyzerMessages = {};
    const errorsByFile = {};
    let totalValidationErrors = 0;
    let totalAnalyzerErrors = 0;
    let totalStderrErrors = 0;
    let totalOtherErrors = 0;
    
    // Aggregate error data from all mods
    modArray.forEach(mod => {
        // Use pre-categorized errors (from refactor-tab-rendering-architecture)
        const valErrors = mod.errorCategories?.validation?.length || 0;
        const analErrors = mod.errorCategories?.analyzer?.length || 0;
        const stderrErrs = mod.errorCategories?.stderr?.length || 0;
        const othErrors = mod.errorCategories?.other?.length || 0;
        
        totalValidationErrors += valErrors;
        totalAnalyzerErrors += analErrors;
        totalStderrErrors += stderrErrs;
        totalOtherErrors += othErrors;
        
        // Track error type counts
        if (valErrors > 0) {
            errorTypes['Validation Errors'] = (errorTypes['Validation Errors'] || 0) + valErrors;
        }
        if (analErrors > 0) {
            errorTypes['Analyzer Errors'] = (errorTypes['Analyzer Errors'] || 0) + analErrors;
        }
        if (stderrErrs > 0) {
            errorTypes['Stderr Errors'] = (errorTypes['Stderr Errors'] || 0) + stderrErrs;
            errorsByFile[mod.fileName] = stderrErrs;
        }
        if (othErrors > 0) {
            errorTypes['Other Errors'] = (errorTypes['Other Errors'] || 0) + othErrors;
        }
        
        // Track validation error messages with occurrence counts
        if (mod.errorCategories?.validation) {
            mod.errorCategories.validation.forEach(error => {
                const msg = `${error.field}: ${error.message}`;
                validationMessages[msg] = (validationMessages[msg] || 0) + 1;
            });
        }
        
        // Track stderr error messages with cleaning and occurrence counts
        if (mod.errorCategories?.stderr) {
            mod.errorCategories.stderr.forEach(error => {
                const msg = error.message || error.line || '';
                if (msg) {
                    const cleanMsg = parser.cleanErrorMessage(msg);
                    if (cleanMsg) {
                        stderrMessages[cleanMsg] = (stderrMessages[cleanMsg] || 0) + 1;
                    }
                }
            });
        }
        
        // Track analyzer error messages with occurrence counts
        if (mod.errorCategories?.analyzer) {
            mod.errorCategories.analyzer.forEach(error => {
                const msg = error.message || error.error || '';
                if (msg) {
                    analyzerMessages[msg] = (analyzerMessages[msg] || 0) + 1;
                }
            });
        }
    });
    
    // Limit message tracking to prevent memory bloat with large sessions
    const limitMessages = (messages, limit = 100) => {
        const entries = Object.entries(messages);
        if (entries.length <= limit) return messages;
        
        // Keep top N by occurrence count
        return Object.fromEntries(
            entries.sort((a, b) => b[1] - a[1]).slice(0, limit)
        );
    };
    
    const limitedStderrMessages = limitMessages(stderrMessages);
    const limitedValidationMessages = limitMessages(validationMessages);
    const limitedAnalyzerMessages = limitMessages(analyzerMessages);
    
    // Calculate total errors
    const totalErrors = totalValidationErrors + totalAnalyzerErrors + totalStderrErrors + totalOtherErrors;
    
    // Category breakdown
    const categories = {};
    modArray.forEach(mod => {
        if (mod.parsed && mod.parsed.category) {
            const cat = mod.parsed.category;
            categories[cat] = (categories[cat] || 0) + 1;
        }
    });
    
    // Collect failed mods for detailed list (only for multi-mod stats)
    const failedMods = modArray.length > 1
        ? modArray.filter(m => m.status === 'failed').map(m => ({
            fileName: m.fileName,
            error: m.error || 'Parser failure'
        }))
        : [];
    
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
        stderrMessages: limitedStderrMessages,
        validationMessages: limitedValidationMessages,
        analyzerMessages: limitedAnalyzerMessages,
        errorsByFile,
        categories,
        totalErrors,
        validationErrors: totalValidationErrors,
        analyzerErrors: totalAnalyzerErrors,
        stderrErrors: totalStderrErrors,
        otherErrors: totalOtherErrors,
        failedMods
    };
}
