/**
 * Unified Validation System
 * 
 * Provides a single source of truth for all mod validation logic.
 * 
 * @example
 * // Create and register validators
 * const registry = new ValidationRegistry();
 * registry.register(new ValidationNode({
 *   id: 'name-valid',
 *   name: 'Valid Name',
 *   field: 'name',
 *   severity: 'error',
 *   check: (mod) => {
 *     if (!mod.parsed?.name || mod.parsed.name === 'unknown') {
 *       return { message: 'Name is required', value: mod.parsed?.name };
 *     }
 *     return null;
 *   }
 * }));
 * 
 * // Validate a mod
 * const result = registry.validate(modData);
 * console.log(result.counts.errors); // Number of errors
 * console.log(result.hasErrors()); // Boolean
 */

/**
 * Represents a single validation check
 */
export class ValidationNode {
    /**
     * @param {Object} config
     * @param {string} config.id - Unique identifier for this validator
     * @param {string} config.name - Human-readable name
     * @param {string} config.field - Which field is being validated
     * @param {'error'|'warning'|'info'} config.severity - Severity level
     * @param {function(Object): {message: string, value: any}|null} config.check - Validation function
     */
    constructor({ id, name, field, severity, check }) {
        this.id = id;
        this.name = name;
        this.field = field;
        this.severity = severity;
        this.check = check;
    }
    
    /**
     * Validate a mod and return an issue if check fails
     * @param {Object} mod - Mod data to validate
     * @returns {{nodeId: string, name: string, field: string, severity: string, message: string, value: any}|null}
     */
    validate(mod) {
        const issue = this.check(mod);
        if (issue) {
            return {
                nodeId: this.id,
                name: this.name,
                field: this.field,
                severity: this.severity,
                message: issue.message,
                value: issue.value
            };
        }
        return null;
    }
}

/**
 * Structured validation result
 */
export class ValidationResult {
    /**
     * @param {Array} issues - Array of validation issues
     */
    constructor(issues) {
        this.issues = issues;
        
        // Index by field for quick lookup
        this.byField = new Map();
        for (const issue of issues) {
            if (!this.byField.has(issue.field)) {
                this.byField.set(issue.field, []);
            }
            this.byField.get(issue.field).push(issue);
        }
        
        // Index by severity
        this.bySeverity = {
            error: issues.filter(i => i.severity === 'error'),
            warning: issues.filter(i => i.severity === 'warning'),
            info: issues.filter(i => i.severity === 'info')
        };
        
        // Quick counts
        this.counts = {
            total: issues.length,
            errors: this.bySeverity.error.length,
            warnings: this.bySeverity.warning.length,
            info: this.bySeverity.info.length
        };
    }
    
    /**
     * Check if there are any error-level issues
     * @returns {boolean}
     */
    hasErrors() {
        return this.counts.errors > 0;
    }
    
    /**
     * Check if there are any issues at all
     * @returns {boolean}
     */
    hasIssues() {
        return this.counts.total > 0;
    }
}

/**
 * Manages validation nodes and orchestrates validation
 */
export class ValidationRegistry {
    constructor() {
        this.nodes = [];
    }
    
    /**
     * Register a validation node
     * @param {ValidationNode} node
     * @returns {ValidationRegistry} - For chaining
     */
    register(node) {
        this.nodes.push(node);
        return this;
    }
    
    /**
     * Run all validation checks on a mod
     * @param {Object} mod - Mod data to validate
     * @returns {ValidationResult}
     */
    validate(mod) {
        const issues = [];
        for (const node of this.nodes) {
            const issue = node.validate(mod);
            if (issue) {
                issues.push(issue);
            }
        }
        
        return new ValidationResult(issues);
    }
}

/**
 * Create and configure the default validation registry
 * @returns {ValidationRegistry}
 */
export function createDefaultRegistry() {
    const registry = new ValidationRegistry();
    
    // Invalid field values
    const INVALID_VALUES = ['none', 'null', '', 'unknown', 'unnamed', 'unnamed mod'];
    const INVALID_VERSION_VALUES = ['none', 'null', '', '0.0.0'];
    
    // Name validator
    registry.register(new ValidationNode({
        id: 'name-valid',
        name: 'Valid Name',
        field: 'name',
        severity: 'error',
        check: (mod) => {
            const name = mod.parsed?.name;
            if (!name || INVALID_VALUES.includes(String(name).trim().toLowerCase())) {
                return { 
                    message: 'Mod name is missing or set to an invalid value',
                    value: name 
                };
            }
            return null;
        }
    }));
    
    // ID validator
    registry.register(new ValidationNode({
        id: 'id-valid',
        name: 'Valid ID',
        field: 'id',
        severity: 'error',
        check: (mod) => {
            const id = mod.parsed?.id;
            if (!id || INVALID_VALUES.includes(String(id).trim().toLowerCase())) {
                return { 
                    message: 'Mod ID is missing or set to an invalid value',
                    value: id 
                };
            }
            return null;
        }
    }));
    
    // UUID validator
    registry.register(new ValidationNode({
        id: 'uuid-valid',
        name: 'Valid UUID',
        field: 'uuid',
        severity: 'error',
        check: (mod) => {
            const uuid = mod.parsed?.uuid;
            if (!uuid || INVALID_VALUES.includes(String(uuid).trim().toLowerCase())) {
                return { 
                    message: 'Mod UUID is missing or set to an invalid value',
                    value: uuid 
                };
            }
            return null;
        }
    }));
    
    // Game validator
    registry.register(new ValidationNode({
        id: 'game-valid',
        name: 'Valid Game',
        field: 'game',
        severity: 'error',
        check: (mod) => {
            const game = mod.parsed?.game;
            if (!game || INVALID_VALUES.includes(String(game).trim().toLowerCase())) {
                return { 
                    message: 'Mod game is missing or set to an invalid value',
                    value: game 
                };
            }
            return null;
        }
    }));
    
    // Version validator
    registry.register(new ValidationNode({
        id: 'version-valid',
        name: 'Valid Version',
        field: 'version',
        severity: 'error',
        check: (mod) => {
            const version = mod.parsed?.version;
            if (!version || INVALID_VERSION_VALUES.includes(String(version).trim().toLowerCase())) {
                return { 
                    message: 'Mod version is missing or set to an invalid value',
                    value: version 
                };
            }
            return null;
        }
    }));
    
    // Category validator
    registry.register(new ValidationNode({
        id: 'category-valid',
        name: 'Valid Category',
        field: 'category',
        severity: 'error',
        check: (mod) => {
            const category = mod.parsed?.category;
            if (!category || INVALID_VALUES.includes(String(category).trim().toLowerCase()) || category === 'err') {
                return { 
                    message: 'Mod category is missing or set to an invalid value',
                    value: category 
                };
            }
            return null;
        }
    }));
    
    // Stderr errors validator (uses mod.errors from extractErrors)
    registry.register(new ValidationNode({
        id: 'stderr-errors',
        name: 'Stderr Errors',
        field: 'errors',
        severity: 'error',
        check: (mod) => {
            // Count all non-context stderr errors
            const count = mod.errors?.filter(e => !e.isContext && e.type === 'error').length || 0;
            
            if (count > 0) {
                return { 
                    message: `Mod has ${count} stderr error(s) that must be resolved`,
                    value: count 
                };
            }
            return null;
        }
    }));
    
    // Analyzer failure validator
    registry.register(new ValidationNode({
        id: 'analyzer-success',
        name: 'Analyzer Success',
        field: 'analyzer',
        severity: 'error',
        check: (mod) => {
            // Check for analyzer-level failure
            if (mod.result?.success === false && mod.result?.error) {
                return { 
                    message: `Analyzer error: ${mod.result.error}`,
                    value: mod.result.error 
                };
            }
            // Check for category 'err' (parser failure)
            if (mod.parsed?.category === 'err') {
                return { 
                    message: 'Parser failure - mod category is "err"',
                    value: 'err' 
                };
            }
            return null;
        }
    }));
    
    return registry;
}
