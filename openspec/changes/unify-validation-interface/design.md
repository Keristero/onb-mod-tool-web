# Design: Unified Validation System

## Context

The current validation approach has grown organically with validation logic scattered across multiple files:
- `parser.mjs`: `validateModSummary()` checks parsed fields
- `main.mjs`: Computes error counts, categorizes errors, determines status
- `results-tab.mjs`: Re-counts errors for display
- `statistics-tab.mjs`: Aggregates error statistics

This has led to inconsistencies where the UI shows "0 errors" while validation messages report "6 parser errors" because different parts of the code use different error counting methods.

## Goals

- **Single source of truth**: All validation logic in one place
- **Consistent error counting**: Same logic used everywhere
- **Extensibility**: Easy to add new validation checks
- **Testability**: Validation logic isolated and testable
- **Maintainability**: Clear separation between validation and display

## Non-Goals

- **Complex validation framework**: Keep it simple, under 200 lines
- **Schema validation**: Not building a general-purpose validator
- **Runtime validation**: Only validate once during mod processing
- **Validation rules engine**: Hard-coded checks are fine

## Architecture

### ValidationNode

Represents a single validation check:

```javascript
class ValidationNode {
  constructor({ id, name, field, severity, check }) {
    this.id = id;           // 'name-required'
    this.name = name;       // 'Name Required'
    this.field = field;     // 'name' (which field to validate)
    this.severity = severity; // 'error' | 'warning' | 'info'
    this.check = check;     // (mod) => issue | null
  }
  
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
```

### ValidationRegistry

Manages all validation nodes and orchestrates validation:

```javascript
class ValidationRegistry {
  constructor() {
    this.nodes = [];
  }
  
  register(node) {
    this.nodes.push(node);
    return this;
  }
  
  validate(mod) {
    const issues = [];
    for (const node of this.nodes) {
      const issue = node.validate(mod);
      if (issue) issues.push(issue);
    }
    
    return new ValidationResult(issues);
  }
}
```

### ValidationResult

Structured validation output:

```javascript
class ValidationResult {
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
  
  hasErrors() {
    return this.counts.errors > 0;
  }
  
  hasIssues() {
    return this.counts.total > 0;
  }
}
```

## Built-in Validation Nodes

### Standard Field Validators

Check for invalid/placeholder values:

```javascript
registry.register(new ValidationNode({
  id: 'name-valid',
  name: 'Valid Name',
  field: 'name',
  severity: 'error',
  check: (mod) => {
    const name = mod.parsed?.name;
    if (!name || name === 'unknown') {
      return { message: 'Mod name is missing or set to "unknown"', value: name };
    }
    return null;
  }
}));

// Similar nodes for: id, uuid, game, version, category
```

### Parser Error Validator

Count actual parser errors from stderr:

```javascript
registry.register(new ValidationNode({
  id: 'parser-errors',
  name: 'Parser Errors',
  field: 'errors',
  severity: 'error',
  check: (mod) => {
    if (!mod.errorsByFile) return null;
    
    let count = 0;
    for (const errors of mod.errorsByFile.values()) {
      count += errors.length;
    }
    
    if (count > 0) {
      return { 
        message: `Mod has ${count} parser error(s) that must be resolved`,
        value: count 
      };
    }
    return null;
  }
}));
```

### Analyzer Failure Validator

Check for analyzer-level failures:

```javascript
registry.register(new ValidationNode({
  id: 'analyzer-success',
  name: 'Analyzer Success',
  field: 'analyzer',
  severity: 'error',
  check: (mod) => {
    if (mod.result?.success === false && mod.result?.error) {
      return { 
        message: `Analyzer error: ${mod.result.error}`,
        value: mod.result.error 
      };
    }
    if (mod.parsed?.category === 'err') {
      return { 
        message: 'Parser failure - mod category is "err"',
        value: 'err' 
      };
    }
    return null;
  }
}));
```

## Integration Pattern

### In main.mjs

```javascript
import { ValidationRegistry } from './validation.mjs';

// Create global registry (or inject as dependency)
const validationRegistry = new ValidationRegistry();

// In processFile():
const modData = { ... };

// Run validation once
modData.validationResult = validationRegistry.validate(modData);

// Derive status from validation
if (modData.validationResult.byField.has('analyzer')) {
  modData.status = 'failed';
} else if (modData.validationResult.hasErrors()) {
  modData.status = 'validation-failed';
} else {
  modData.status = 'success';
}

// Backward compatibility
modData.validationErrors = modData.validationResult.issues
  .filter(i => i.severity === 'error')
  .map(i => ({ field: i.field, message: i.message }));

// Error categories from validation result
modData.errorCategories = {
  validation: modData.validationResult.bySeverity.error
    .filter(i => i.field !== 'analyzer' && i.field !== 'errors'),
  analyzer: modData.validationResult.byField.get('analyzer') || [],
  stderr: modData.validationResult.byField.get('errors') || [],
  other: []
};
```

### In results-tab.mjs

```javascript
renderSummary(parsed, result) {
  const validationResult = this.currentMod?.validationResult;
  
  // Get error count from validation result (single source of truth)
  const errorCount = validationResult?.counts.errors || 0;
  const parserErrors = validationResult?.byField.get('errors')?.[0]?.value || 0;
  
  // Display
  return `
    <div class="summary-item">
      <div>Errors</div>
      <div>${parserErrors}</div>
    </div>
  `;
}
```

## Decisions

### Decision: Use class-based nodes instead of plain functions

**Rationale**: 
- Clear structure with metadata (id, name, field, severity)
- Easier to introspect and debug
- Can add features like caching, async support later
- Minimal complexity cost

**Alternatives considered**:
- Plain functions with metadata objects → harder to extend
- Decorator pattern → overkill for our needs

### Decision: Validation happens once during mod processing

**Rationale**:
- Validation is deterministic (same inputs → same outputs)
- Avoids re-computation on every render
- Aligns with recently refactored architecture

**Alternatives considered**:
- Validate on-demand in tabs → inconsistent timing
- Reactive validation → unnecessary complexity

### Decision: ValidationResult is immutable

**Rationale**:
- Results are computed once and never change
- Prevents accidental mutations
- Easier to reason about data flow

**Alternatives considered**:
- Mutable result object → bug-prone

### Decision: Keep backward compatibility with `mod.validationErrors`

**Rationale**:
- Gradual migration of existing code
- Reduces risk of breaking existing functionality
- Can be removed in Phase 4 cleanup

**Alternatives considered**:
- Break all existing code → too risky
- Use adapter pattern → overkill

## Migration Strategy

1. **Phase 1**: Implement validation system alongside existing code
2. **Phase 2**: Update main.mjs to use new system, maintain old structure
3. **Phase 3**: Update UI components one at a time
4. **Phase 4**: Remove old validation code after verification

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Different error counts during transition | Medium | Test with known mods, compare counts |
| Performance regression | Low | Validation is already cached, just restructured |
| Breaking existing features | High | Maintain backward compat, gradual rollout |
| Complexity creep | Medium | Keep under 200 lines, resist abstraction |

## Open Questions

None - design is ready for implementation.
