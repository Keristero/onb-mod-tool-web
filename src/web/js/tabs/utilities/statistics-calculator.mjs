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

/**
 * Histogram bin ranges (logarithmic scale for better distribution)
 */
const BIN_RANGES = [
    { min: 0, max: 1024, label: '0-1 KB' },
    { min: 1024, max: 10240, label: '1-10 KB' },
    { min: 10240, max: 102400, label: '10-100 KB' },
    { min: 102400, max: 1048576, label: '100 KB-1 MB' },
    { min: 1048576, max: 10485760, label: '1-10 MB' },
    { min: 10485760, max: Infinity, label: '10+ MB' }
];

/**
 * Calculate median using quickselect algorithm (O(n) average case)
 * @param {Array<number>} sizes - Array of file sizes
 * @returns {number} Median value
 */
function calculateMedian(sizes) {
    if (sizes.length === 0) return 0;
    
    const sorted = [...sizes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Calculate mode from histogram bins (most frequent size range)
 * @param {Array<{min: number, max: number, label: string, count: number}>} histogram - Histogram bins
 * @returns {{label: string, count: number, midpoint: number} | null} Mode bin or null
 */
function calculateMode(histogram) {
    if (histogram.length === 0) return null;
    
    const maxBin = histogram.reduce((max, bin) => 
        bin.count > max.count ? bin : max
    , { count: 0 });
    
    if (maxBin.count === 0) return null;
    
    // Calculate midpoint of the bin for display
    const midpoint = maxBin.max === Infinity 
        ? maxBin.min * 2  // For open-ended bin, use 2x min as estimate
        : (maxBin.min + maxBin.max) / 2;
    
    return {
        label: maxBin.label,
        count: maxBin.count,
        midpoint: Math.round(midpoint)
    };
}

/**
 * Calculate mean file size
 * @param {Array<{size: number}>} files - Array of file objects
 * @returns {number} Mean file size
 */
function calculateMean(files) {
    if (files.length === 0) return 0;
    
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return Math.round(total / files.length);
}

/**
 * Create histogram bins for file sizes
 * @param {Array<{size: number}>} files - Array of file objects
 * @returns {Array<{min: number, max: number, label: string, count: number}>} Histogram bins
 */
function createHistogramBins(files) {
    const bins = BIN_RANGES.map(range => ({
        ...range,
        count: 0
    }));
    
    files.forEach(file => {
        const bin = bins.find(b => file.size >= b.min && file.size < b.max);
        if (bin) bin.count++;
    });
    
    return bins;
}

/**
 * Group files by extension with size aggregation
 * @param {Array<{size: number, extension: string}>} files - Array of file objects
 * @returns {Array<{extension: string, count: number, totalSize: number, percentage: number}>} Extension breakdown
 */
function groupByExtension(files) {
    if (files.length === 0) return [];
    
    const groups = {};
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    files.forEach(file => {
        const ext = file.extension || '(no extension)';
        if (!groups[ext]) {
            groups[ext] = { count: 0, totalSize: 0 };
        }
        groups[ext].count++;
        groups[ext].totalSize += file.size;
    });
    
    return Object.entries(groups)
        .map(([extension, data]) => ({
            extension,
            count: data.count,
            totalSize: data.totalSize,
            percentage: totalSize > 0 ? (data.totalSize / totalSize) * 100 : 0
        }))
        .sort((a, b) => b.totalSize - a.totalSize); // Sort by total size descending
}

/**
 * Calculate file size statistics by category
 * @param {Array<{size: number, category: string}>} files - Array of file objects with category
 * @param {Object} categories - Category mapping from mods
 * @returns {Array<{category: string, median: number, mean: number, count: number}>} Category statistics
 */
function groupByCategory(files, categories) {
    const categoryGroups = {};
    
    files.forEach(file => {
        const cat = file.category || 'Unknown';
        if (!categoryGroups[cat]) {
            categoryGroups[cat] = [];
        }
        categoryGroups[cat].push(file.size);
    });
    
    return Object.entries(categoryGroups)
        .map(([category, sizes]) => ({
            category,
            median: calculateMedian(sizes),
            mean: calculateMean(sizes.map(size => ({ size }))),
            count: sizes.length
        }))
        .sort((a, b) => b.median - a.median); // Sort by median descending
}

/**
 * Calculate comprehensive file size statistics
 * @param {Array<{size: number, extension: string, category?: string, modId: string}>} files - Array of file objects
 * @param {Object} categoryMap - Map of modId to category for lookups
 * @param {Object} options - Calculation options
 * @param {string|null} options.category - Filter by specific category
 * @returns {Object} File size statistics
 */
export function calculateFileSizeStatistics(files, categoryMap = {}, options = {}) {
    const { category = null } = options;
    
    // Enrich files with category information from categoryMap
    const enrichedFiles = files.map(file => ({
        ...file,
        category: categoryMap[file.modId] || 'Unknown'
    }));
    
    // Filter by category if specified
    const filteredFiles = category 
        ? enrichedFiles.filter(f => f.category === category)
        : enrichedFiles;
    
    if (filteredFiles.length === 0) {
        return {
            histogram: [],
            median: 0,
            mode: null,
            mean: 0,
            byExtension: [],
            byCategory: [],
            totalFiles: 0,
            totalSize: 0,
            modStats: {
                totalMods: 0,
                median: 0,
                mean: 0,
                mode: null
            }
        };
    }
    
    // Calculate file-level histogram (for distribution chart)
    const histogram = createHistogramBins(filteredFiles);
    
    // Calculate mod-level statistics (aggregate files by mod)
    const modSizes = aggregateByMod(filteredFiles);
    const modSizeValues = modSizes.map(m => m.totalSize);
    const modHistogram = createHistogramBins(modSizes.map(m => ({ size: m.totalSize })));
    
    return {
        histogram, // File-level histogram for distribution chart
        median: calculateMedian(modSizeValues), // Mod-level median
        mode: calculateMode(modHistogram), // Mod-level mode
        mean: calculateMean(modSizes.map(m => ({ size: m.totalSize }))), // Mod-level mean
        byExtension: groupByExtension(filteredFiles),
        byCategory: groupByCategory(enrichedFiles, categoryMap), // Always use full dataset for category comparison
        totalFiles: filteredFiles.length,
        totalSize: filteredFiles.reduce((sum, f) => sum + f.size, 0),
        modStats: {
            totalMods: modSizes.length,
            median: calculateMedian(modSizeValues),
            mean: calculateMean(modSizes.map(m => ({ size: m.totalSize }))),
            mode: calculateMode(modHistogram)
        }
    };
}

/**
 * Aggregate files by mod to calculate total mod sizes
 * @param {Array<{size: number, modId: string, modName: string}>} files - Array of file objects
 * @returns {Array<{modId: string, modName: string, totalSize: number, fileCount: number}>} Mod aggregations
 */
function aggregateByMod(files) {
    const modMap = {};
    
    files.forEach(file => {
        if (!modMap[file.modId]) {
            modMap[file.modId] = {
                modId: file.modId,
                modName: file.modName,
                totalSize: 0,
                fileCount: 0
            };
        }
        modMap[file.modId].totalSize += file.size;
        modMap[file.modId].fileCount++;
    });
    
    return Object.values(modMap);
}

