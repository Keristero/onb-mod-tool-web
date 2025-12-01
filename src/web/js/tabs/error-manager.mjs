// ErrorManager - Centralized error parsing and management

/**
 * Split a file path into segments, handling both / and \ separators
 */
export function pathToSegments(path) {
    if (!path) return [];
    return path.replace(/\\/g, '/').split('/').filter(s => s.length > 0);
}

/**
 * Check if two paths match, comparing them as arrays of segments
 * Returns true if paths are identical or if one is a suffix of the other
 * BUT: single-segment paths (root files) only match other single-segment paths
 */
export function pathsMatch(requestedPath, errorPath) {
    const requested = pathToSegments(requestedPath);
    const error = pathToSegments(errorPath);
    
    // Special case: single-segment paths (root files) should NOT match multi-segment paths
    // This prevents "entry.lua" from matching "shield/entry.lua"
    if (requested.length === 1 && error.length > 1) {
        return false;
    }
    if (error.length === 1 && requested.length > 1) {
        return false;
    }
    
    // Exact match
    if (requested.length === error.length) {
        return requested.every((seg, i) => seg === error[i]);
    }
    
    // Check if requested is a suffix of error
    // Example: requested=["shield","entry.lua"] matches error=["foo","shield","entry.lua"]
    if (requested.length < error.length) {
        const offset = error.length - requested.length;
        return requested.every((seg, i) => seg === error[offset + i]);
    }
    
    // Check if error is a suffix of requested
    // Example: error=["shield","entry.lua"] matches requested=["foo","shield","entry.lua"]
    if (error.length < requested.length) {
        const offset = requested.length - error.length;
        return error.every((seg, i) => seg === requested[offset + i]);
    }
    
    return false;
}

/**
 * Find the best matching file from a list of candidates
 * Returns the file with the highest match score, or null if no match
 */
export function findBestPathMatch(targetPath, candidatePaths) {
    const targetSegments = pathToSegments(targetPath);
    
    let bestMatch = null;
    let bestMatchScore = -1;
    
    for (const candidate of candidatePaths) {
        const candidateSegments = pathToSegments(candidate);
        let score = 0;
        
        // Exact match - highest priority
        if (targetSegments.length === candidateSegments.length &&
            targetSegments.every((seg, i) => seg === candidateSegments[i])) {
            score = 1000 + targetSegments.length;
        }
        // Suffix match - match as many trailing segments as possible
        else if (pathsMatch(targetPath, candidate)) {
            score = 500 + Math.min(targetSegments.length, candidateSegments.length);
        }
        // Basename match - only if both are root-level files (single segment)
        else if (targetSegments.length === 1 && candidateSegments.length === 1 &&
                 targetSegments[0] === candidateSegments[0]) {
            score = 100;
        }
        
        if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = candidate;
        }
    }
    
    // Only return a match if we actually found one (score > 0)
    if (bestMatchScore <= 0) {
        return null;
    }
    
    return bestMatch;
}

export class ErrorManager {
    constructor() {
        this.errorsByFile = new Map(); // fileName -> [{line, column, message}]
        this.rawStderr = '';
    }
    
    /**
     * Parse stderr and build error map
     */
    parseErrors(stderr) {
        if (!stderr) return;
        
        this.rawStderr = stderr;
        this.errorsByFile.clear();
        
        const lines = stderr.split('\n');
        
        // First pass: collect all error locations
        const errorLocations = [];
        for (let i = 0; i < lines.length; i++) {
            const locationMatch = lines[i].match(/^\[\s*(\d+)\s*:\s*(\d+)\s*\]/);
            if (locationMatch) {
                const messageMatch = lines[i].match(/\]\s*(.+)$/);
                errorLocations.push({
                    lineIndex: i,
                    line: parseInt(locationMatch[1]),
                    column: parseInt(locationMatch[2]),
                    message: messageMatch ? messageMatch[1].trim() : 'Error'
                });
            }
        }
        
        // Second pass: find file mentions
        const fileMentions = [];
        const filePatterns = [
            /"([\w\-\.\/\\]+\.lua)"/g,
            /evaluating\s+([\w\-\.\/\\]+\.lua)/g,
            /in\s+"([\w\-\.\/\\]+\.lua)"/g
        ];
        
        for (let i = 0; i < lines.length; i++) {
            for (const pattern of filePatterns) {
                let match;
                while ((match = pattern.exec(lines[i])) !== null) {
                    const file = match[1].replace(/\\/g, '/');
                    fileMentions.push({ lineIndex: i, file });
                }
            }
        }
        
        // Third pass: associate errors with files
        const errorToFileMap = new Map();
        
        for (const mention of fileMentions) {
            for (let i = 0; i < errorLocations.length; i++) {
                const error = errorLocations[i];
                if (error.lineIndex < mention.lineIndex && !errorToFileMap.has(i)) {
                    errorToFileMap.set(i, mention.file);
                }
            }
        }
        
        // Default unassociated errors to entry.lua
        for (let i = 0; i < errorLocations.length; i++) {
            if (!errorToFileMap.has(i)) {
                errorToFileMap.set(i, 'entry.lua');
            }
        }
        
        // Build error map by file
        for (let i = 0; i < errorLocations.length; i++) {
            const error = errorLocations[i];
            const file = errorToFileMap.get(i);
            
            if (!this.errorsByFile.has(file)) {
                this.errorsByFile.set(file, []);
            }
            
            this.errorsByFile.get(file).push({
                line: error.line,
                column: error.column,
                message: error.message
            });
        }
    }
    
    /**
     * Get errors for a specific file (with path-aware matching)
     */
    getErrorsForFile(fileName) {
        if (!fileName) return [];
        
        const errorFiles = Array.from(this.errorsByFile.keys());
        const bestMatch = findBestPathMatch(fileName, errorFiles);
        
        return bestMatch ? [...this.errorsByFile.get(bestMatch)] : [];
    }
    
    /**
     * Check if a file has errors
     */
    hasErrors(fileName) {
        return this.getErrorsForFile(fileName).length > 0;
    }
    
    /**
     * Get all files that have errors
     */
    getFilesWithErrors() {
        return Array.from(this.errorsByFile.keys());
    }
    
    /**
     * Get total error count
     */
    getTotalErrorCount() {
        let count = 0;
        for (const errors of this.errorsByFile.values()) {
            count += errors.length;
        }
        return count;
    }
}
