# Unify Validation Interface - Tasks

## Phase 1: Create Validation System

### Task 1.1: Implement ValidationNode class
- [x] Create `src/web/js/validation.mjs`
- [x] Implement `ValidationNode` class with:
  - Constructor: `id`, `name`, `field`, `severity`, `check` function
  - `validate(mod)` method returning issue or null
  - Support for async checks (future extensibility)
- **File**: `src/web/js/validation.mjs`

### Task 1.2: Implement ValidationRegistry
- [x] Create `ValidationRegistry` class managing validation nodes
- [x] Implement `register(node)` to add validators
- [x] Implement `validate(mod)` to run all checks and return `ValidationResult`
- [x] `ValidationResult` structure: `{ issues: [], byField: Map, bySeverity: Map, counts: {} }`
- **File**: `src/web/js/validation.mjs`

### Task 1.3: Create built-in validation nodes
- [x] Name validator (check for 'unknown', empty)
- [x] ID validator (check for 'unknown', empty)
- [x] UUID validator (check for 'unknown', empty)
- [x] Game validator (check for 'unknown', empty)
- [x] Version validator (check for '0.0.0', invalid formats)
- [x] Category validator (check for 'err', 'unknown')
- [x] Parser errors validator (count errors from stderr using ErrorManager)
- **File**: `src/web/js/validation.mjs`

## Phase 2: Integrate into Mod Processing

### Task 2.1: Update main.mjs to use validation system
- [x] Import `ValidationRegistry` and create singleton instance
- [x] Replace manual validation code with `registry.validate(modData)`
- [x] Store result as `modData.validationResult`
- [x] Derive `modData.status` from validation result:
  - 'failed' if any error-level analyzer issues
  - 'validation-failed' if any error-level validation issues
  - 'success' otherwise
- [x] Maintain backward compatibility: set `mod.validationErrors` for existing code
- **File**: `src/web/js/main.mjs`

### Task 2.2: Update error categorization
- [x] Derive `mod.errorCategories` from `validationResult`:
  - `validation`: Issues from validation nodes (severity: error/warning)
  - `analyzer`: Built-in analyzer failures
  - `stderr`: Parser errors from ErrorManager
  - `other`: Any uncategorized issues
- [x] Remove duplicate error counting logic
- **File**: `src/web/js/main.mjs`

## Phase 3: Update UI Components

### Task 3.1: Update ResultsTab
- [x] Use `mod.validationResult.issues` instead of `mod.validationErrors`
- [x] Display validation issues with severity badges
- [x] Use `validationResult.counts.errors` for error count display
- [x] Update summary cards to show accurate parser error count
- **File**: `src/web/js/tabs/results-tab.mjs`

### Task 3.2: Update StatisticsTab
- [x] Use `mod.validationResult` for error aggregation
- [x] Remove manual error category extraction
- [x] Use `validationResult.counts` for accurate statistics
- **File**: `src/web/js/tabs/statistics-tab.mjs`

### Task 3.3: Update error count calculation
- [x] Remove duplicate `errorCount` calculation from renderSummary
- [x] Use single source: `mod.validationResult.byField.get('errors')`
- [x] Ensure consistency between validation error message and display
- **File**: `src/web/js/tabs/results-tab.mjs`

## Phase 4: Testing and Documentation

### Task 4.1: Test validation system
- [x] Test with mod having parser errors (verify count matches)
- [x] Test with mod having validation errors (name, uuid, etc.)
- [x] Test with mod having both types of errors
- [x] Test with successful mod (no errors)
- [x] Verify statistics aggregation is accurate
- **Manual testing required**

### Task 4.2: Clean up legacy code
- [x] Remove old `validateModSummary` function from parser.mjs (or mark deprecated)
- [x] Remove duplicate error counting logic
- [x] Update inline comments referencing old validation approach
- **Files**: `src/web/js/parser.mjs`, `src/web/js/main.mjs`

### Task 4.3: Documentation
- [x] Add JSDoc comments to ValidationNode and ValidationRegistry
- [x] Document validation node registration pattern
- [x] Add example of creating custom validation node
- **File**: `src/web/js/validation.mjs`

## Success Criteria

- ✅ Error count displayed in UI matches validation error message (e.g., "6 parser errors" → displays 6)
- ✅ Single validation pass produces all error categories
- ✅ All tabs use the same validation result source
- ✅ New validation checks can be added by registering nodes
- ✅ No regression in existing validation behavior
- ✅ Backward compatible: old code still works during transition
