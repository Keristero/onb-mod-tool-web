// DOM Manipulation Helpers - Safe wrappers for common DOM operations

/**
 * Add one or more CSS classes to an element
 * Supports both string and array inputs
 * @param {HTMLElement} element - Target element
 * @param {...(string|string[])} classes - Class names to add
 */
export function addClass(element, ...classes) {
    if (!element) return;
    
    const classNames = classes.flat().filter(Boolean);
    element.classList.add(...classNames);
}

/**
 * Remove one or more CSS classes from an element
 * Supports both string and array inputs
 * @param {HTMLElement} element - Target element
 * @param {...(string|string[])} classes - Class names to remove
 */
export function removeClass(element, ...classes) {
    if (!element) return;
    
    const classNames = classes.flat().filter(Boolean);
    element.classList.remove(...classNames);
}

/**
 * Toggle a CSS class on an element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - If provided, adds class when true, removes when false
 * @returns {boolean} True if class is present after toggle
 */
export function toggleClass(element, className, force) {
    if (!element) return false;
    return element.classList.toggle(className, force);
}

/**
 * Efficiently remove all child nodes from an element
 * @param {HTMLElement} element - Element to clear
 */
export function empty(element) {
    if (!element) return;
    
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Hide an element by setting display to none
 * @param {HTMLElement} element - Element to hide
 */
export function hide(element) {
    if (!element) return;
    element.style.display = 'none';
}

/**
 * Show a hidden element by restoring display property
 * @param {HTMLElement} element - Element to show
 * @param {string} [display=''] - Display value to set (empty string removes inline style)
 */
export function show(element, display = '') {
    if (!element) return;
    element.style.display = display;
}

/**
 * Create a button element with common configuration
 * @param {string} text - Button text content
 * @param {Object} options - Button configuration
 * @param {string} [options.className] - CSS class name(s)
 * @param {Function} [options.onClick] - Click event handler
 * @param {Object} [options.dataset] - Data attributes
 * @param {string} [options.type='button'] - Button type attribute
 * @returns {HTMLButtonElement} Created button element
 */
export function createButton(text, options = {}) {
    const button = document.createElement('button');
    button.textContent = text;
    button.type = options.type || 'button';
    
    if (options.className) {
        button.className = options.className;
    }
    
    if (options.onClick) {
        button.addEventListener('click', options.onClick);
    }
    
    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            button.dataset[key] = value;
        });
    }
    
    return button;
}

/**
 * Create a div element with class and content
 * @param {string} className - CSS class name(s)
 * @param {string|HTMLElement} [content] - Content (text or element)
 * @returns {HTMLDivElement} Created div element
 */
export function createDiv(className, content) {
    const div = document.createElement('div');
    
    if (className) {
        div.className = className;
    }
    
    if (content !== undefined) {
        if (typeof content === 'string') {
            div.textContent = content;
        } else if (content instanceof HTMLElement) {
            div.appendChild(content);
        }
    }
    
    return div;
}

/**
 * Append multiple children to a parent element
 * @param {HTMLElement} parent - Parent element
 * @param {...(HTMLElement|HTMLElement[])} children - Child elements to append
 * @returns {HTMLElement} The parent element (for chaining)
 */
export function appendChildren(parent, ...children) {
    if (!parent) return parent;
    
    children.flat().forEach(child => {
        if (child instanceof HTMLElement) {
            parent.appendChild(child);
        }
    });
    
    return parent;
}
