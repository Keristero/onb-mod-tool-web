// ErrorManager - Centralized error parsing and management

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
     * Get errors for a specific file (with fuzzy matching)
     */
    getErrorsForFile(fileName) {
        if (!fileName) return [];
        
        const normalizedFileName = fileName.replace(/\\/g, '/');
        const fileBasename = normalizedFileName.split('/').pop();
        
        // Try to find matching errors
        for (const [errorFile, errors] of this.errorsByFile.entries()) {
            const errorFileNormalized = errorFile.replace(/\\/g, '/');
            const errorBasename = errorFileNormalized.split('/').pop();
            
            // Flexible matching
            if (
                errorFileNormalized === normalizedFileName ||
                errorFileNormalized.endsWith('/' + normalizedFileName) ||
                normalizedFileName.endsWith('/' + errorFileNormalized) ||
                normalizedFileName.endsWith(errorFileNormalized) ||
                normalizedFileName.includes(errorFileNormalized) ||
                errorFileNormalized.includes(normalizedFileName) ||
                errorBasename === fileBasename
            ) {
                return [...errors]; // Return a copy
            }
        }
        
        return [];
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
