// IssueManager - Centralized error and warning parsing and management

import { extractErrors } from '../parser.mjs';

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

export class IssueManager {
    constructor() {
        this.errorsByFile = new Map(); // fileName -> [{line, column, message, type}]
        this.warningsByFile = new Map(); // fileName -> [{line, column, message, type}]
        this.rawStderr = '';
    }
    
    /**
     * Parse stderr and build error and warning maps
     */
    parseIssues(stderr) {
        if (!stderr) return;
        
        this.rawStderr = stderr;
        this.errorsByFile.clear();
        this.warningsByFile.clear();
        
        // Use the comprehensive parser from parser.mjs
        const allItems = extractErrors(stderr);
        
        // Separate errors and warnings
        const errorsOnly = allItems.filter(item => item.type === 'error');
        const warningsOnly = allItems.filter(item => item.type === 'warning');
        
        // Build error map
        for (const error of errorsOnly) {
            const file = error.file || 'entry.lua';
            
            if (!this.errorsByFile.has(file)) {
                this.errorsByFile.set(file, []);
            }
            
            this.errorsByFile.get(file).push({
                line: error.line,
                column: error.column,
                message: error.message,
                type: 'error'
            });
        }
        
        // Build warning map
        for (const warning of warningsOnly) {
            const file = warning.file || 'entry.lua';
            
            if (!this.warningsByFile.has(file)) {
                this.warningsByFile.set(file, []);
            }
            
            this.warningsByFile.get(file).push({
                line: warning.line,
                column: warning.column,
                message: warning.message,
                type: 'warning'
            });
        }
    }
    
    /**
     * Backward compatibility: parseErrors now calls parseIssues
     */
    parseErrors(stderr) {
        this.parseIssues(stderr);
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
     * Get warnings for a specific file (with path-aware matching)
     */
    getWarningsForFile(fileName) {
        if (!fileName) return [];
        
        const warningFiles = Array.from(this.warningsByFile.keys());
        const bestMatch = findBestPathMatch(fileName, warningFiles);
        
        return bestMatch ? [...this.warningsByFile.get(bestMatch)] : [];
    }
    
    /**
     * Get all issues (both errors and warnings) for a file
     */
    getIssuesForFile(fileName) {
        return [
            ...this.getErrorsForFile(fileName),
            ...this.getWarningsForFile(fileName)
        ];
    }
    
    /**
     * Check if a file has errors
     */
    hasErrors(fileName) {
        return this.getErrorsForFile(fileName).length > 0;
    }
    
    /**
     * Check if a file has warnings
     */
    hasWarnings(fileName) {
        return this.getWarningsForFile(fileName).length > 0;
    }
    
    /**
     * Check if a file has any issues (errors or warnings)
     */
    hasIssues(fileName) {
        return this.hasErrors(fileName) || this.hasWarnings(fileName);
    }
    
    /**
     * Get all files that have errors
     */
    getFilesWithErrors() {
        return Array.from(this.errorsByFile.keys());
    }
    
    /**
     * Get all files that have warnings
     */
    getFilesWithWarnings() {
        return Array.from(this.warningsByFile.keys());
    }
    
    /**
     * Get all files with any issues
     */
    getFilesWithIssues() {
        return Array.from(new Set([
            ...this.getFilesWithErrors(),
            ...this.getFilesWithWarnings()
        ]));
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
    
    /**
     * Get total warning count
     */
    getTotalWarningCount() {
        let count = 0;
        for (const warnings of this.warningsByFile.values()) {
            count += warnings.length;
        }
        return count;
    }
    
    /**
     * Get total issue count
     */
    getTotalIssueCount() {
        return this.getTotalErrorCount() + this.getTotalWarningCount();
    }
}
