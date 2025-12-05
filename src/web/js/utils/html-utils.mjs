// HTML/XML Utilities - Escaping and element creation helpers

/**
 * Escape HTML special characters to prevent XSS attacks
 * Consolidated from 5 different implementations across the codebase
 * @param {*} text - Text to escape
 * @returns {string} HTML-safe escaped text
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Escape XML special characters
 * Consolidated from 2 different implementations
 * @param {*} text - Text to escape
 * @returns {string} XML-safe escaped text
 */
export function escapeXml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Create an HTML element with optional properties
 * Reduces boilerplate for common element creation patterns
 * @param {string} tag - HTML tag name (e.g., 'div', 'span', 'button')
 * @param {Object} options - Element configuration
 * @param {string} [options.className] - CSS class name(s)
 * @param {string} [options.textContent] - Safe text content
 * @param {string} [options.innerHTML] - HTML content (use with caution)
 * @param {Object} [options.dataset] - Data attributes as key-value pairs
 * @param {Object} [options.attributes] - Additional attributes as key-value pairs
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
        element.className = options.className;
    }
    
    if (options.textContent !== undefined) {
        element.textContent = options.textContent;
    } else if (options.innerHTML !== undefined) {
        element.innerHTML = options.innerHTML;
    }
    
    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            element.dataset[key] = value;
        });
    }
    
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
    
    return element;
}

/**
 * Safely set element content, choosing between textContent and innerHTML
 * @param {HTMLElement} element - Target element
 * @param {string} content - Content to set
 * @param {boolean} [safe=true] - If true, uses textContent; if false, uses innerHTML
 */
export function setElementContent(element, content, safe = true) {
    if (!element) return;
    
    if (safe) {
        element.textContent = content;
    } else {
        element.innerHTML = content;
    }
}
