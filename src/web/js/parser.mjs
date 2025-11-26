// JSON parsing and formatting utilities

/**
 * Parse and validate mod analysis result
 */
export function parseAnalysisResult(result) {
    if (!result || !result.data) {
        return {
            valid: false,
            error: 'Invalid result structure'
        };
    }
    
    return {
        valid: true,
        id: result.data.id || 'unknown',
        name: result.data.name || 'Unnamed Mod',
        description: result.data.description || '',
        version: result.data.version || '0.0.0',
        category: result.data.category || 'unknown',
        bytes: result.data.bytes || 0,
        data: result.data.data || {},
        stdout: result.stdout || '',
        stderr: result.stderr || ''
    };
}

/**
 * Extract error information from stderr
 */
export function extractErrors(stderr) {
    if (!stderr) return [];
    
    const errors = [];
    const lines = stderr.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('ERR:')) {
            errors.push({
                type: 'error',
                message: line.substring(5).trim()
            });
        } else if (line.startsWith('WARN:')) {
            errors.push({
                type: 'warning',
                message: line.substring(6).trim()
            });
        }
    }
    
    return errors;
}

/**
 * Parse error messages to extract file paths and line numbers
 */
export function parseErrorLocation(errorMessage) {
    // Match patterns like: file.lua:10:5 or file.lua line 10
    const patterns = [
        /([^:]+):(\d+):(\d+)/,  // file:line:column
        /([^:]+):(\d+)/,         // file:line
        /([^\s]+) line (\d+)/    // file line N
    ];
    
    for (const pattern of patterns) {
        const match = errorMessage.match(pattern);
        if (match) {
            return {
                file: match[1],
                line: parseInt(match[2]),
                column: match[3] ? parseInt(match[3]) : null
            };
        }
    }
    
    return null;
}

/**
 * Extract dependency information from mod data
 */
export function extractDependencies(modData) {
    const packageId = modData.id || 'unknown';
    let dependencies = [];
    
    // Check for library type with dependencies
    if (modData.data && modData.data.type === 'library' && modData.data.dependencies) {
        dependencies = modData.data.dependencies;
    }
    
    // Check for any other dependency fields
    if (modData.dependencies) {
        dependencies = [...dependencies, ...modData.dependencies];
    }
    
    return {
        packageId,
        dependencies: [...new Set(dependencies)] // Remove duplicates
    };
}

/**
 * Format bytes to human readable size
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
 */
export function formatDuration(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Create a collapsible JSON tree structure
 */
export function createJsonTree(obj, key = null, level = 0) {
    const indent = '  '.repeat(level);
    const lines = [];
    
    if (key !== null) {
        lines.push(`${indent}<span class="json-key">"${key}"</span>: `);
    }
    
    if (obj === null) {
        lines.push(`<span class="json-null">null</span>`);
    } else if (typeof obj === 'boolean') {
        lines.push(`<span class="json-boolean">${obj}</span>`);
    } else if (typeof obj === 'number') {
        lines.push(`<span class="json-number">${obj}</span>`);
    } else if (typeof obj === 'string') {
        lines.push(`<span class="json-string">"${escapeHtml(obj)}"</span>`);
    } else if (Array.isArray(obj)) {
        if (obj.length === 0) {
            lines.push('[]');
        } else {
            lines.push(`<span class="json-expand" data-expanded="true">▼</span>[`);
            for (let i = 0; i < obj.length; i++) {
                const item = obj[i];
                lines.push(createJsonTree(item, null, level + 1));
                if (i < obj.length - 1) lines.push(',');
            }
            lines.push(`${indent}]`);
        }
    } else if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            lines.push('{}');
        } else {
            lines.push(`<span class="json-expand" data-expanded="true">▼</span>{`);
            keys.forEach((k, i) => {
                lines.push(createJsonTree(obj[k], k, level + 1));
                if (i < keys.length - 1) lines.push(',');
            });
            lines.push(`${indent}}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Search JSON object for matching keys or values
 */
export function searchJson(obj, query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    function search(item, path = []) {
        if (item === null || item === undefined) return;
        
        if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
                const currentPath = [...path, key];
                
                // Check if key matches
                if (key.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        path: currentPath.join('.'),
                        key,
                        value
                    });
                }
                
                // Check if value matches (for primitives)
                if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        path: currentPath.join('.'),
                        key,
                        value
                    });
                } else if (typeof value === 'number' && value.toString().includes(query)) {
                    results.push({
                        path: currentPath.join('.'),
                        key,
                        value
                    });
                }
                
                // Recurse for nested objects
                if (typeof value === 'object') {
                    search(value, currentPath);
                }
            }
        }
    }
    
    search(obj);
    return results;
}
