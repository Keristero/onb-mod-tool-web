/**
 * LuaGlobalsHighlighter
 * 
 * Enhances Lua syntax highlighting by identifying and marking ONB-specific global
 * functions, tables, and variables based on metadata extracted from DartLangModTool.
 */

export class LuaGlobalsHighlighter {
  /**
   * @param {Object} metadata - Metadata object containing lua field
   */
  constructor(metadata) {
    // Support both old (luaGlobals) and new (lua) structure
    const luaData = metadata?.lua || metadata?.luaGlobals || {};
    this.globals = this.buildGlobalsLookup(luaData);
    this.tables = luaData.tables || {};
  }

  /**
   * Build a fast lookup set for global identifiers
   * @param {Object} luaGlobals - The lua object from metadata
   * @returns {Set<string>} Set of global identifier names
   */
  buildGlobalsLookup(luaGlobals) {
    const lookup = new Set();
    
    // Add global functions
    if (luaGlobals.functions) {
      luaGlobals.functions.forEach(fn => lookup.add(fn));
    }
    
    // Add table names (but not their fields to avoid false positives)
    if (luaGlobals.tables) {
      Object.keys(luaGlobals.tables).forEach(table => {
        lookup.add(table);
      });
    }
    
    // Add global variables
    if (luaGlobals.variables) {
      luaGlobals.variables.forEach(v => lookup.add(v));
    }
    
    return lookup;
  }

  /**
   * Enhance highlight.js output by adding ONB global markers
   * @param {HTMLElement} codeElement - The <code> element containing highlighted Lua
   */
  enhanceHighlighting(codeElement) {
    if (!codeElement) return;
    
    // Process text nodes and span elements to find identifiers
    this.processNode(codeElement);
  }

  /**
   * Recursively process DOM nodes to find and mark identifiers
   * @param {Node} node - DOM node to process
   */
  processNode(node) {
    if (!node) return;

    // Process element nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Check if this is a highlighted identifier
      if (this.isIdentifierElement(node)) {
        const text = node.textContent.trim();
        
        // Check if this identifier is an ONB global
        if (this.globals.has(text)) {
          node.classList.add('hljs-onb-global');
        }
        
        // Check for table member access (e.g., Element.Fire)
        // Look at next sibling to see if there's a dot and another identifier
        const parent = node.parentNode;
        if (parent && this.isTableMemberAccess(node)) {
          node.classList.add('hljs-onb-global');
        }
      }
      
      // Recursively process children
      Array.from(node.childNodes).forEach(child => this.processNode(child));
    }
  }

  /**
   * Check if an element is likely an identifier in highlight.js output
   * @param {Element} element 
   * @returns {boolean}
   */
  isIdentifierElement(element) {
    if (element.tagName !== 'SPAN') return false;
    
    // highlight.js typically uses these classes for identifiers
    const identifierClasses = [
      'hljs-name',
      'hljs-built_in',
      'hljs-title',
      'hljs-variable',
      'hljs-keyword' // Some globals might be marked as keywords
    ];
    
    return identifierClasses.some(cls => element.classList.contains(cls));
  }

  /**
   * Check if this element is part of a table member access pattern
   * @param {Element} element 
   * @returns {boolean}
   */
  isTableMemberAccess(element) {
    const text = element.textContent.trim();
    
    // Check if this is a known table name
    if (!this.globals.has(text)) return false;
    
    // Look ahead to see if there's a dot followed by another identifier
    let next = element.nextSibling;
    
    // Skip whitespace nodes
    while (next && next.nodeType === Node.TEXT_NODE && !next.textContent.trim()) {
      next = next.nextSibling;
    }
    
    // Check for dot
    if (next && next.nodeType === Node.TEXT_NODE && next.textContent.includes('.')) {
      return true;
    }
    
    // Check for punctuation span containing dot
    if (next && next.nodeType === Node.ELEMENT_NODE && 
        next.classList.contains('hljs-punctuation') && 
        next.textContent.includes('.')) {
      return true;
    }
    
    return false;
  }
}

/**
 * Load metadata for a specific analyzer version
 * @param {string} version - Version string (e.g., "v1.0.4" or "latest")
 * @returns {Promise<Object>} Metadata object
 */
export async function loadVersionMetadata(version = 'latest') {
  try {
    const metadataPath = version === 'latest' 
      ? 'versions/latest/metadata.json'
      : `versions/${version}/metadata.json`;
    
    const response = await fetch(metadataPath);
    if (!response.ok) {
      console.warn(`Failed to load metadata from ${metadataPath}`);
      return {};
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Failed to load version metadata:', error);
    return {};
  }
}
