// Formatting Utilities - Data formatting helpers

/**
 * Format bytes to human-readable size
 * Moved from parser.mjs for centralized access
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable
 * Moved from parser.mjs for centralized access
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "1.23s" or "456ms")
 */
export function formatDuration(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format a timestamp or date to a consistent string format
 * @param {Date|string|number} date - Date to format
 * @param {string} [format='short'] - Format type: 'short', 'long', 'time', 'date'
 * @returns {string} Formatted date string
 */
export function formatTimestamp(date, format = 'short') {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const options = {
        'short': { dateStyle: 'short', timeStyle: 'short' },
        'long': { dateStyle: 'long', timeStyle: 'medium' },
        'time': { timeStyle: 'medium' },
        'date': { dateStyle: 'medium' }
    };
    
    return d.toLocaleString(undefined, options[format] || options.short);
}

/**
 * Format a number with consistent decimal places
 * @param {number} num - Number to format
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toFixed(decimals);
}
