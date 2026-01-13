// Statistics Calculation Utilities - Pure calculation logic for mod statistics

import * as parser from '../../parser.mjs';

/**
 * Calculates comprehensive statistics for one or more mods
 * Includes tracking of validation warnings as a distinct category from errors
 * Tracks statistics including: successWithWarnings, totalWarnings, validWithWarningsRate
 * 
 * @param {Object|Array<Object>} mods - Single mod object or array of mod objects
 * @param {Object} options - Calculation options (currently unused, reserved for future)
 * @returns {Object} Statistics object with aggregated data including warning metrics
 */
export function calculateStatistics(mods, options = {}) {
    // Normalize input: ensure mods is always an array
    const modArray = Array.isArray(mods) ? mods : [mods];
    
    const total = modArray.length;
    const successful = modArray.filter(m => m.status === 'success').length;
    const successWithWarnings = modArray.filter(m => m.status === 'success-with-warnings').length;
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
    
    // Initialize error and warning tracking objects
    const errorTypes = {};
    const stderrMessages = {};
    const validationMessages = {};
    const analyzerMessages = {};
    const warningMessages = {};
    const warningTypes = {};
    const errorsByFile = {};
    let totalValidationErrors = 0;
    let totalAnalyzerErrors = 0;
    let totalStderrErrors = 0;
    let totalOtherErrors = 0;
    let totalWarnings = 0;
    let totalStderrWarnings = 0;
    
    // Aggregate error and warning data from all mods
    modArray.forEach(mod => {
        // Use pre-categorized errors (from refactor-tab-rendering-architecture)
        const valErrors = mod.errorCategories?.validation?.length || 0;
        const analErrors = mod.errorCategories?.analyzer?.length || 0;
        const stderrErrs = mod.errorCategories?.stderr?.length || 0;
        const othErrors = mod.errorCategories?.other?.length || 0;
        const stderrWarns = mod.errorCategories?.warnings?.length || 0;
        
        totalValidationErrors += valErrors;
        totalAnalyzerErrors += analErrors;
        totalStderrErrors += stderrErrs;
        totalOtherErrors += othErrors;
        totalWarnings += stderrWarns;
        totalStderrWarnings += stderrWarns;
        
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
        
        // Track warning type counts
        if (stderrWarns > 0) {
            warningTypes['Warnings'] = (warningTypes['Warnings'] || 0) + stderrWarns;
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
        
        // Track stderr warning messages with occurrence counts
        if (mod.errorCategories?.warnings) {
            mod.errorCategories.warnings.forEach(warning => {
                const msg = warning.message || warning.line || '';
                if (msg) {
                    const cleanMsg = parser.cleanErrorMessage(msg);
                    if (cleanMsg) {
                        warningMessages[cleanMsg] = (warningMessages[cleanMsg] || 0) + 1;
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
    const limitedWarningMessages = limitMessages(warningMessages);
    
    // Calculate total errors
    const totalErrors = totalValidationErrors + totalAnalyzerErrors + totalStderrErrors + totalOtherErrors;
    
    // Calculate mods with warnings percentage
    const modsWithWarningsRate = total > 0 ? (successWithWarnings / total * 100).toFixed(1) : 0;
    
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
        successWithWarnings,
        validationFailed,
        failed,
        successRate: total > 0 ? ((successful + successWithWarnings) / total * 100).toFixed(1) : 0,
        validationSuccessRate: total > 0 ? ((successful + successWithWarnings) / total * 100).toFixed(1) : 0,
        modsWithWarningsRate,
        avgTime,
        minTime,
        maxTime,
        errorTypes,
        stderrMessages: limitedStderrMessages,
        validationMessages: limitedValidationMessages,
        analyzerMessages: limitedAnalyzerMessages,
        warningMessages: limitedWarningMessages,
        warningTypes,
        errorsByFile,
        categories,
        totalErrors,
        totalWarnings,
        validationErrors: totalValidationErrors,
        analyzerErrors: totalAnalyzerErrors,
        stderrErrors: totalStderrErrors,
        stderrWarnings: totalStderrWarnings,
        otherErrors: totalOtherErrors,
        failedMods
    };
}
