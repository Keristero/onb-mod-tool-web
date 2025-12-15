# Implementation Tasks

## Phase 1: Metadata Extraction
- [ ] Add method deduplication logic to `extract_globals.js`
  - Track method counts across object types
  - Identify methods appearing in 2+ types as "Common"
  - Remove duplicates from type-specific arrays
  - Merge with existing Common methods from manual definitions
- [ ] Add configuration option for common threshold (default: 2+ types)
- [ ] Test extraction with current DartLangModTool source
- [ ] Verify output structure in generated metadata.json

## Phase 2: Syntax Highlighting Updates
- [ ] Refactor `applyCustomSyntaxHighlighting` in `base-tab.mjs`
  - Reorder method highlighting: type-specific first, then Common
  - Ensure Common methods override type-specific classes
  - Update regex matching to handle priority correctly
- [ ] Update tooltip generation for Common methods
  - Show "Common method: shared by [types]" format
  - List all object types that share the method
- [ ] Test highlighting with sample Lua code containing shared methods

## Phase 3: Metadata Regeneration
- [ ] Run extraction script on current DartLangModTool source
- [ ] Regenerate metadata.json for all versions in `src/web/versions/`
- [ ] Verify Common list contains expected methods:
  - set_name (4 types)
  - set_description (3 types)
  - set_health (2 types)
  - set_attack (2 types)
  - set_speed (2 types)
  - set_color (2 types)
  - set_icon_texture (2 types)
- [ ] Confirm type-specific arrays no longer contain Common methods

## Phase 4: Visual Verification
- [ ] Load test mod files in web interface
- [ ] Verify common methods display with green highlighting
- [ ] Verify type-specific methods retain their original colors
- [ ] Check tooltip accuracy for Common methods
- [ ] Test across different tabs (File Browser, Results)

## Phase 5: Documentation
- [ ] Update README.md with Common method classification explanation
- [ ] Document extraction script behavior in script comments
- [ ] Add examples to project documentation showing Common vs specific methods

## Validation Checklist
- [ ] All shared methods consistently colored green
- [ ] No regressions in type-specific method highlighting
- [ ] Tooltips show accurate type information
- [ ] Metadata structure remains backward compatible
- [ ] Extraction script handles edge cases (0, 1, 2+ types)
- [ ] Performance impact negligible (no additional loops)

## Dependencies
- Phase 2 depends on Phase 1 (needs updated metadata structure)
- Phase 3 depends on Phase 1 (needs updated extraction logic)
- Phase 4 depends on Phases 2 and 3 (needs both code and data)
- Phase 5 can proceed in parallel with Phase 4
