# Prioritize Common Object Methods in Syntax Highlighting

## Overview
Improve syntax highlighting for ONB Lua API methods that are shared across multiple object types (Block, Card, Mob, Player) by introducing a "Common" classification that takes precedence over type-specific classifications when methods appear in multiple types.

## Motivation
Currently, when a method like `set_name` is shared across multiple object types (Block, Card, Mob, Player), the syntax highlighter assigns it a type-specific color based on whichever type is processed first in the iteration order. This creates inconsistent and misleading visual feedback:

- `set_name` currently appears as `hljs-onb-method-block` (sky blue) because Block happens to be first alphabetically
- Similarly shared methods like `set_description`, `set_health`, `set_attack`, `set_speed`, `set_color`, and `set_icon_texture` are also colored inconsistently
- Developers expect common methods to have a unified appearance indicating they work across multiple types
- The "Common" object type already exists in the metadata but contains only a partial list of shared methods

## Current Behavior
```json
"objectMethods": {
  "Block": ["set_name", "set_description", ...],
  "Card": ["set_icon_texture", ...],
  "Common": ["declare_package_id", "set_description", "set_name", "set_preview_texture"],
  "Mob": ["set_name", "set_description", "set_health", ...],
  "Player": ["set_name", "set_health", "set_attack", ...]
}
```

Methods appearing in the "Common" list are currently highlighted with `hljs-onb-method-common` (green), but:
1. Not all shared methods are in the Common list
2. Type-specific entries can override Common classification due to iteration order
3. The extraction script doesn't automatically detect which methods are truly common

## Proposed Changes

### 1. Metadata Extraction Enhancement
Update `scripts/extract_globals.js` to:
- Detect methods that appear in multiple object types
- Automatically populate the "Common" category with truly shared methods
- Remove duplicates from type-specific lists, keeping them only in Common
- Preserve manually-defined Common methods that may not follow patterns

### 2. Syntax Highlighting Priority
Update `src/web/js/tabs/base-tab.mjs` to:
- Process Common methods **after** type-specific methods, ensuring they override
- Apply `hljs-onb-method-common` class to shared methods
- Update tooltips to indicate "Common method: shared by Block, Card, Mob, Player"

### 3. Visual Design
The existing green color (`#22c55e`) for `hljs-onb-method-common` appropriately conveys "universal/shared" semantics and should be retained.

## Benefits
- **Consistency**: Shared methods always have the same color regardless of context
- **Learning**: Developers immediately see which methods are universal vs type-specific
- **Accuracy**: Automated detection eliminates manual maintenance of the Common list
- **Maintainability**: Future API additions automatically classified correctly

## Impact
- **Breaking**: None (purely additive enhancement to existing highlighting)
- **Files Modified**: 
  - `scripts/extract_globals.js` (extraction logic)
  - `src/web/js/tabs/base-tab.mjs` (highlighting order)
  - `src/web/versions/*/metadata.json` (regenerated with new Common list)

## Examples

### Before
```lua
local my_block = Block.new()
my_block:set_name("Custom Block")  -- Sky blue (block-specific color)

local my_card = Card.new()
my_card:set_name("Custom Card")    -- Sky blue (same as block, misleading)
```

### After
```lua
local my_block = Block.new()
my_block:set_name("Custom Block")  -- Green (common method)

local my_card = Card.new()
my_card:set_name("Custom Card")    -- Green (common method)
```

## Out of Scope
- Changing colors for type-specific methods
- Modifying the underlying Dart analysis tool
- Handling methods that are similar but have different signatures across types
