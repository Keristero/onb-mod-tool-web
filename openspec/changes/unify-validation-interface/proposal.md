# Unify Validation Interface

## Why

The current validation system has several problems:

1. **Inconsistent error counting**: The UI displays "0 errors" even when validation correctly detects 6 parser errors because error counting logic is duplicated and inconsistent between `main.mjs` (uses regex match for `[line:column]` format) and `results-tab.mjs` (counts `ERR:` prefixed lines).

2. **Scattered validation logic**: Validation errors are computed in multiple places (`parser.mjs`, `main.mjs`, `results-tab.mjs`) with different methods, making it hard to maintain consistency.

3. **No single source of truth**: Error categories (`errorCategories.validation`, `errorCategories.analyzer`, `errorCategories.stderr`) are populated separately, and there's no unified validation model that components can reference.

4. **Fragile error extraction**: The code manually parses stderr strings in multiple ways (regex for `[line:column]`, string splits for `ERR:` prefixes) which breaks when error formats change.

## What Changes

Introduce a **Validation Node system** that serves as the single source of truth for all validation issues:

- Create `ValidationNode` class representing a single validation check with:
  - Unique ID and human-readable name
  - Check function that examines mod data
  - Severity level (error, warning, info)
  - Field reference (which mod property it validates)
  - Dynamic computation with caching

- Create `ValidationRegistry` that manages all validation nodes:
  - Built-in nodes for standard checks (name, id, uuid, version, category, parser errors)
  - Extensible registration for custom validators
  - Single validation pass that populates all categories

- Refactor mod processing to use validation system:
  - Replace manual validation in `main.mjs` with `ValidationRegistry.validate(mod)`
  - Store validation results as `mod.validationResult` with structured issues
  - Derive `mod.status` and `mod.errorCategories` from validation results

- Update UI components to consume validation results:
  - Results tab displays validation issues from `mod.validationResult`
  - Statistics tab aggregates from validation results
  - Error counts computed once during validation

## Impact

**Affected code:**
- `src/web/js/main.mjs` - Use validation registry instead of manual validation
- `src/web/js/parser.mjs` - Extract `validateModSummary` into validation nodes
- `src/web/js/tabs/results-tab.mjs` - Display validation results
- `src/web/js/tabs/statistics-tab.mjs` - Aggregate validation results
- New file: `src/web/js/validation.mjs` - Validation system implementation

**Benefits:**
- ✅ Single source of truth for all validation logic
- ✅ Consistent error counting across all UI
- ✅ Easier to add new validation checks
- ✅ Validation logic is testable in isolation
- ✅ Dynamic validation (can add checks without changing mod processing)

**Breaking changes:**
- None externally (API compatible)
- Internal: `mod.validationErrors` becomes `mod.validationResult.issues`
- Internal: Error counting logic unified in validation system
