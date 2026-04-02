# Syntax Highlighting Specification Delta

## MODIFIED Requirements

### Requirement: Object Method Highlighting Priority
The syntax highlighting engine SHALL prioritize Common methods over type-specific methods when applying CSS classes.

**Previous behavior**: Methods were highlighted based on iteration order of `objectMethods` entries, with earlier types overriding later ones
**New behavior**: Common methods are processed last, overriding any type-specific highlighting

#### Scenario: Common method overrides type-specific highlighting
**Given** the metadata contains:
```json
{
  "objectMethods": {
    "Block": [],
    "Common": ["set_name"],
    "Player": []
  }
}
```

**And** Lua code contains: `block:set_name("Test")`

**When** syntax highlighting is applied

**Then** the highlighted output SHALL contain:
```html
<span class="hljs-onb-method-common" data-onb-type="method" data-onb-name="set_name" data-onb-extra="Common">set_name</span>
```

**And** the class SHALL NOT be `hljs-onb-method-block`

#### Scenario: Type-specific method retains original color
**Given** the metadata contains:
```json
{
  "objectMethods": {
    "Block": ["set_shape"],
    "Common": []
  }
}
```

**And** Lua code contains: `block:set_shape([[...]])`

**When** syntax highlighting is applied

**Then** the highlighted output SHALL contain:
```html
<span class="hljs-onb-method-block" data-onb-type="method" data-onb-name="set_shape" data-onb-extra="Block">set_shape</span>
```

### Requirement: Method Highlighting Processing Order
The highlighting algorithm SHALL process object methods in two passes: type-specific methods first, then Common methods.

#### Scenario: Two-pass highlighting algorithm
**Given** metadata with both type-specific and Common methods

**When** `applyCustomSyntaxHighlighting()` is called for Lua code

**Then** the algorithm SHALL:
1. Extract Common methods from `objectMethods.Common`
2. Process all non-Common types with existing regex replacement
3. Process Common methods with regex that replaces existing method spans
4. Return the final highlighted HTML

#### Scenario: Common method regex replacement
**Given** HTML already contains: `:foo<span class="hljs-onb-method-block">set_name</span>`

**When** Common method processing runs for `set_name`

**Then** the HTML SHALL be transformed to: `:foo<span class="hljs-onb-method-common" data-onb-type="method" data-onb-name="set_name" data-onb-extra="Common">set_name</span>`

## ADDED Requirements

### Requirement: Enhanced Method Tooltips
Tooltips for Common methods SHALL display which object types share the method.

#### Scenario: Tooltip for common method
**Given** metadata contains:
```json
{
  "objectMethods": {
    "Common": ["set_name"]
  },
  "methodSharing": {
    "set_name": ["Block", "Mob", "Player"]
  }
}
```

**And** the user hovers over a `set_name` method call

**When** the tooltip is displayed

**Then** it SHALL show:
```
Common method: set_name
Shared by: Block, Mob, Player
```

#### Scenario: Tooltip for type-specific method (unchanged)
**Given** a type-specific method like `create_spawner` in Mob

**When** the user hovers over it

**Then** the tooltip SHALL display the existing format:
```
Mob:create_spawner

All Mob methods:
[list of methods]
```

### Requirement: Backward Compatibility
The highlighting system SHALL gracefully handle metadata without the new `methodSharing` field.

#### Scenario: Missing methodSharing field
**Given** metadata from an older version without `methodSharing`

**When** displaying a Common method tooltip

**Then** the tooltip SHALL show:
```
Common method: set_name
```

**And** SHALL NOT display the "Shared by:" line
**And** SHALL NOT throw errors or fail to render
