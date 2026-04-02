# Utility Modules

This directory contains centralized utility functions used throughout the application. These utilities have been consolidated from multiple locations to reduce code duplication and improve maintainability.

## Modules

### html-utils.mjs
HTML/XML escaping and element creation helpers.

**Functions:**
- `escapeHtml(text)` - Escape HTML special characters to prevent XSS attacks
- `escapeXml(text)` - Escape XML special characters  
- `createElement(tag, options)` - Create HTML elements with optional properties
- `setElementContent(element, content, safe)` - Safely set element content

**Usage:**
```javascript
import { escapeHtml, createElement } from './utils/html-utils.mjs';

// Escape user input
const safe = escapeHtml(userInput);

// Create elements
const div = createElement('div', {
    className: 'my-class',
    textContent: 'Safe text',
    dataset: { id: '123' }
});
```

### format-utils.mjs
Data formatting utilities for bytes, durations, dates, and numbers.

**Functions:**
- `formatBytes(bytes)` - Format bytes to human-readable size (e.g., "1.5 MB")
- `formatDuration(ms)` - Format milliseconds to readable duration (e.g., "1.23s")
- `formatTimestamp(date, format)` - Format dates consistently
- `formatNumber(num, decimals)` - Format numbers with consistent decimal places

**Usage:**
```javascript
import { formatBytes, formatDuration } from './utils/format-utils.mjs';

console.log(formatBytes(1536)); // "1.5 KB"
console.log(formatDuration(1234)); // "1.23s"
```

### dom-helpers.mjs
DOM manipulation helpers for common operations.

**Functions:**
- `addClass(element, ...classes)` - Add CSS classes (supports arrays)
- `removeClass(element, ...classes)` - Remove CSS classes
- `toggleClass(element, className, force)` - Toggle CSS class
- `empty(element)` - Efficiently clear element children
- `hide(element)` / `show(element, display)` - Show/hide helpers
- `createButton(text, options)` - Create button with common configuration
- `createDiv(className, content)` - Create div with class and content
- `appendChildren(parent, ...children)` - Bulk append children

**Usage:**
```javascript
import { addClass, createButton } from './utils/dom-helpers.mjs';

// Add classes
const el = document.querySelector('.my-element');
if (el) {
    addClass(el, 'active', 'highlighted');
}

// Create elements
const btn = createButton('Click me', {
    className: 'btn-primary',
    onClick: () => console.log('clicked')
});
```

## Benefits

1. **Single Source of Truth** - Utility functions are defined once and imported where needed
2. **Easier Testing** - Utilities can be tested in isolation
3. **Better Discoverability** - Developers know where to find and add utilities
4. **Reduced Code Duplication** - Eliminated 200+ lines of duplicate code
5. **Improved Maintainability** - Updates only need to be made in one place

## Migration Notes

This consolidation replaced duplicate implementations from:
- `parser.mjs` - escapeHtml, formatBytes, formatDuration
- `base-tab.mjs` - escapeHtml, escapeXml, formatBytes
- `results-tab.mjs` - escapeHtml
- `statistics-tab.mjs` - escapeHtml
- `chart-renderer.mjs` - escapeHtml
- `data-exporter.mjs` - escapeXml

All modules have been updated to import from these centralized utilities.
