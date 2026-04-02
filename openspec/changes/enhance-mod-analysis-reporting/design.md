# Design: Enhance Mod Analysis Reporting

## Context
The mod analyzer web interface displays results from parsing ONB mod files. Currently, it shows summary fields and errors but lacks validation of the parsed data. Users cannot distinguish between mods that failed to parse vs mods that parsed successfully but have invalid metadata.

## Goals / Non-Goals

### Goals
- Provide clear validation feedback for all critical metadata fields
- Distinguish between parser errors (from WASM module) and web validation errors (client-side checks)
- Display complete program output (both stdout and stderr) for debugging
- Improve statistics visualization to show error type breakdowns
- Maintain backward compatibility with existing error tracking

### Non-Goals
- Not modifying the WASM analyzer itself (zero core modifications principle)
- Not performing deep semantic validation (just presence/format checks)
- Not adding new metadata fields beyond existing ones
- Not changing the underlying JSON structure from the analyzer

## Decisions

### Validation Architecture
**Decision**: Implement validation as pure functions in `parser.mjs` that take parsed data and return validation results.

**Rationale**: 
- Separates concerns (parsing vs validation)
- Makes validation logic testable and reusable
- Follows existing pattern of utility functions in parser.mjs
- Allows validation to be applied anywhere parsed data is available

**Alternatives considered**:
- Validation in results-tab: Too tightly coupled to display logic
- Validation in worker: Would require WASM modifications (violates constraint)

### Three-Tier Success States
**Decision**: Introduce three states: Success, Validation Failed, Failed

**State definitions**:
1. **Success**: `category !== 'err'` AND `validationErrors.length === 0`
2. **Validation Failed**: `category !== 'err'` AND `validationErrors.length > 0`
3. **Failed**: `category === 'err'`

**Rationale**:
- Clear hierarchy: parsing failure is worse than validation failure
- Allows users to distinguish "technically correct but incomplete" from "completely broken"
- Maintains existing error categorization while adding validation layer
- Statistics can show both parsing success rate and validation success rate

**Alternatives considered**:
- Two states (success/failed): Too coarse, doesn't distinguish validation issues
- Four+ states: Too complex, diminishing returns

### Validation Rules
**Decision**: Validate the following:

1. **Errors must be 0**: `errorCount === 0`
2. **Name must exist**: `name && name !== 'none' && name !== 'null' && name !== ''`
3. **ID must exist**: `id && id !== 'none' && id !== 'null' && id !== ''`
4. **UUID must exist**: `uuid && uuid !== 'none' && uuid !== 'null' && uuid !== ''`
5. **Game must exist**: `game && game !== 'none' && game !== 'null' && game !== 'unknown' && game !== ''`
6. **Version must exist**: `version && version !== 'none' && version !== 'null' && version !== '' && version !== '0.0.0'`
7. **Category must exist**: `category && category !== 'none' && category !== 'null' && category !== 'unknown' && category !== ''`

**Rationale**:
- These are the critical fields mod creators need to set correctly
- Empty/null/default values indicate incomplete mod setup
- Error count validation ensures parsing succeeded cleanly
- Matches the fields currently displayed in summary (minus path which is removed)

### Error Type Categorization
**Decision**: Track two error categories: "Parser Errors" and "Web Validation Errors"

**Rationale**:
- Parser errors come from the WASM analyzer (actual Lua parsing issues)
- Web validation errors come from our client-side checks (metadata completeness)
- Separating them helps users understand if issue is with their Lua code or their metadata
- Enables two separate pie charts in statistics: one for parse success rate, one for error types

**Data structure**:
```javascript
{
  parserErrors: [
    { file: 'entry.lua', line: 10, column: 5, message: 'Expected token' }
  ],
  validationErrors: [
    { field: 'name', message: 'Name is required' },
    { field: 'uuid', message: 'UUID is required' }
  ]
}
```

### Stdout Display
**Decision**: Display stdout in a separate `<pre>` block above stderr in the console output section

**Rationale**:
- Stdout may contain useful debugging information or progress messages
- Keeping it separate from stderr maintains clarity about error vs non-error output
- Placing it above stderr follows common convention (stdout first, then stderr)
- Uses same highlighting as stderr for consistency

## Risks / Trade-offs

### Risk: False Positives
**Risk**: Validation might flag legitimate mods as invalid (e.g., a lib mod with no UUID)

**Mitigation**: 
- Make validation rules specific to mod type where possible
- Document validation rules clearly in UI tooltips
- Allow users to see both parser status and validation status separately

### Risk: Performance Impact
**Risk**: Adding validation checks might slow down processing

**Mitigation**:
- Validation functions are simple boolean checks (O(1) operations)
- Runs after parsing completes, not during parsing
- Negligible impact compared to WASM parsing time

### Trade-off: Complexity vs Information
**Trade-off**: Three success states add UI complexity

**Justification**: The additional information (validation vs parsing failure) is valuable enough to justify the extra state. Users frequently ask "why did my mod fail" and this helps answer that.

## Migration Plan

### Phase 1: Add Validation Layer (No Breaking Changes)
1. Add validation functions to `parser.mjs`
2. Update `results-tab.mjs` to run validation and display results
3. Track validation errors separately from parser errors
4. Three-tier status visible in UI

### Phase 2: Update Statistics
1. Add validation error tracking to statistics calculations
2. Add new pie chart for error types
3. Update existing charts to show three states instead of two
4. Update CSV/XML exports to include validation status

### Phase 3: Documentation
1. Update README with validation rules
2. Add inline help tooltips explaining validation
3. Document error categories in user guide

### Rollback Plan
If validation causes issues:
1. Feature flag to disable validation display
2. Fall back to two-state success/failed
3. Keep collecting validation data for analysis

## Open Questions
None at this time.
