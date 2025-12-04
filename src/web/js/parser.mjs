// JSON parsing and formatting utilities

/**
 * Parse UUID to extract game, version, category, and name
 * Format: game@version/category/name
 * Example: "onb@2.0.0/player/MegamanBN6_falzar"
 */
export function parseUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return {
            game: 'unknown',
            version: '0.0.0',
            category: 'unknown',
            name: 'unknown',
            path: ''
        };
    }
    
    // Split by @ to get game and rest
    const atSplit = uuid.split('@');
    if (atSplit.length < 2) {
        // No @ found, treat entire string as name
        return {
            game: 'unknown',
            version: '0.0.0',
            category: 'unknown',
            name: uuid,
            path: ''
        };
    }
    
    const game = atSplit[0];
    const rest = atSplit[1];
    
    // Split by / to get version and path components
    const slashSplit = rest.split('/');
    if (slashSplit.length < 2) {
        // Only version, no path
        return {
            game,
            version: slashSplit[0],
            category: 'unknown',
            name: 'unknown',
            path: ''
        };
    }
    
    const version = slashSplit[0];
    const pathParts = slashSplit.slice(1);
    const category = pathParts[0] || 'unknown';
    const name = pathParts[pathParts.length - 1] || 'unknown';
    const path = pathParts.join('/');
    
    return {
        game,
        version,
        category,
        name,
        path
    };
}

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
    
    // Extract UUID information if available
    const uuid = result.data.uuid || result.data.id || '';
    const uuidInfo = parseUuid(uuid);
    
    // Debug logging for unnamed values
    const rawName = result.data.name;
    const rawId = result.data.id;
    if (!rawName || String(rawName).toLowerCase().includes('unnamed')) {
        console.warn('WASM returned unnamed/missing name:', { rawName, rawId, uuid, result: result.data });
    }
    
    // Prefer UUID-extracted values, fallback to direct fields
    return {
        valid: true,
        id: result.data.id || uuidInfo.name || 'unknown',
        uuid: uuid,
        game: uuidInfo.game,
        name: result.data.name || uuidInfo.name || 'Unnamed Mod',
        description: result.data.description || '',
        version: uuidInfo.version || result.data.version || '0.0.0',
        category: uuidInfo.category || result.data.category || 'unknown',
        path: uuidInfo.path,
        bytes: result.data.bytes || 0,
        data: result.data.data || {},
        stdout: result.stdout || '',
        stderr: result.stderr || ''
    };
}

/**
 * Clean error message by removing [line:column] prefix
 * Example: "[193:20] Found TokenType.kDot..." -> "Found TokenType.kDot..."
 * Also handles spaces: "[ 193:20 ] Found..." -> "Found..."
 */
export function cleanErrorMessage(message) {
    if (!message) return message;
    // Remove [line:column] prefix (with or without spaces)
    return message.replace(/^\[\s*\d+\s*:\s*\d+\s*\]\s*/, '');
}

/**
 * Extract error information from stderr
 */
export function extractErrors(stderr) {
    if (!stderr) return [];
    
    const errors = [];
    const lines = stderr.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Skip context lines (indented lines starting with "...")
        // These provide stack trace info but aren't errors themselves
        if (/^\s+\.\.\./.test(line)) {
            continue;
        }
        
        // Skip summary lines
        if (trimmed.startsWith('Errors while evaluating')) {
            continue;
        }
        
        // Everything else that's not empty is treated as an stderr error
        // This includes:
        // - ERR: prefixed errors
        // - WARN: prefixed warnings
        // - [line:column] location-based errors
        // - Script missing: errors
        // - Other runtime errors like "A programmer forgot..."
        // - Function argument mismatches
        // - Any other error messages
        
        const errorType = line.startsWith('WARN:') ? 'warning' : 'error';
        errors.push({
            type: errorType,
            message: trimmed,
            line: trimmed,
            isContext: false
        });
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

/**
 * Constants for invalid field values
 */
const INVALID_VALUES = ['none', 'null', '', 'unknown'];
const INVALID_VERSION_VALUES = ['none', 'null', '', '0.0.0'];

/**
 * Validate a single mod field
 */
export function validateModField(fieldName, value, invalidValues = INVALID_VALUES) {
    if (value === null || value === undefined) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    const stringValue = String(value).trim();
    
    if (invalidValues.includes(stringValue.toLowerCase())) {
        return { valid: false, message: `${fieldName} must be set to a valid value` };
    }
    
    return { valid: true };
}

/**
 * Validate mod summary data
 */
export function validateModSummary(parsed, errorCount) {
    const validationErrors = [];
    
    // Validate name
    const nameValidation = validateModField('Name', parsed.name);
    if (!nameValidation.valid) {
        validationErrors.push({
            field: 'name',
            message: nameValidation.message
        });
    }
    
    // Validate id
    const idValidation = validateModField('ID', parsed.id);
    if (!idValidation.valid) {
        validationErrors.push({
            field: 'id',
            message: idValidation.message
        });
    }
    
    // Validate uuid
    const uuidValidation = validateModField('UUID', parsed.uuid);
    if (!uuidValidation.valid) {
        validationErrors.push({
            field: 'uuid',
            message: uuidValidation.message
        });
    }
    
    // Validate game
    const gameValidation = validateModField('Game', parsed.game);
    if (!gameValidation.valid) {
        validationErrors.push({
            field: 'game',
            message: gameValidation.message
        });
    }
    
    // Validate version
    const versionValidation = validateModField('Version', parsed.version, INVALID_VERSION_VALUES);
    if (!versionValidation.valid) {
        validationErrors.push({
            field: 'version',
            message: versionValidation.message
        });
    }
    
    // Validate category
    const categoryValidation = validateModField('Category', parsed.category);
    if (!categoryValidation.valid) {
        validationErrors.push({
            field: 'category',
            message: categoryValidation.message
        });
    }
    
    // Validate error count
    if (errorCount > 0) {
        validationErrors.push({
            field: 'errors',
            message: `Mod has ${errorCount} stderr error(s) that must be resolved`
        });
    }
    
    return validationErrors;
}
