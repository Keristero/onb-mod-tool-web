// BaseTab - Common functionality for all tab components

import { escapeHtml, escapeXml, createElement } from '../utils/html-utils.mjs';
import { formatBytes } from '../utils/format-utils.mjs';

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape text for use in HTML attribute values
 */
function escapeAttribute(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
}

export default class BaseTab {
    constructor() {
        this.container = null;
        this.currentMod = null;
        this.zipArchive = null;
        this.needsRender = false;
        this.luaMetadata = null; // Store metadata for tooltips
    }
    
    /**
     * Initialize the tab with a container element
     * Subclasses should override to set up their specific UI
     */
    async init(container) {
        this.container = container;
        this.initTooltips();
    }
    
    /**
     * Initialize tooltip system for ONB highlighted elements
     */
    initTooltips() {
        // Create tooltip element if it doesn't exist
        if (!document.querySelector('.onb-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.className = 'onb-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Set up event delegation for tooltip hover
        if (this.container) {
            this.addEventListener(this.container, 'mouseover', (e) => {
                const target = e.target.closest('[data-onb-type]');
                if (target) {
                    this.showOnbTooltip(target, e);
                }
            });
            
            this.addEventListener(this.container, 'mouseout', (e) => {
                const target = e.target.closest('[data-onb-type]');
                if (target) {
                    this.hideOnbTooltip();
                }
            });
            
            this.addEventListener(this.container, 'mousemove', (e) => {
                const target = e.target.closest('[data-onb-type]');
                if (target) {
                    this.updateOnbTooltipPosition(e);
                }
            });
        }
    }
    
    /**
     * Show tooltip for ONB highlighted element
     */
    showOnbTooltip(element, event) {
        const tooltip = document.querySelector('.onb-tooltip');
        if (!tooltip) return;
        
        // Get metadata keys from data attributes
        const type = element.getAttribute('data-onb-type');
        const name = element.getAttribute('data-onb-name');
        const extraName = element.getAttribute('data-onb-extra');
        
        if (!type || !name || !this.luaMetadata) return;
        
        let text = '';
        
        // Generate tooltip text based on type
        if (type === 'function') {
            text = `Global Function: ${name}`;
        } else if (type === 'table') {
            const fields = this.luaMetadata.tables[name] || [];
            const fieldList = fields.length > 0 ? fields.join(', ') : 'No fields';
            text = `Table: ${name}\nFields (${fields.length}): ${fieldList}`;
        } else if (type === 'enum-value') {
            text = `${name}.${extraName}`;
        } else if (type === 'variable') {
            text = `Global Variable: ${name}`;
        } else if (type === 'method') {
            if (extraName === 'Common') {
                // For common methods, show which types share this method
                const sharedBy = this.luaMetadata.methodSharing && this.luaMetadata.methodSharing[name];
                if (sharedBy && sharedBy.length > 0) {
                    text = `Common method: ${name}\nShared by: ${sharedBy.join(', ')}`;
                } else {
                    text = `Common method: ${name}`;
                }
            } else {
                // Type-specific method
                const methods = this.luaMetadata.objectMethods[extraName] || [];
                const methodList = methods.join(', ');
                text = `${extraName}:${name}\n\nAll ${extraName} methods:\n${methodList}`;
            }
        }
        
        if (!text) return;
        
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        this.updateOnbTooltipPosition(event);
    }
    
    /**
     * Hide tooltip
     */
    hideOnbTooltip() {
        const tooltip = document.querySelector('.onb-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }
    
    /**
     * Update tooltip position based on mouse position
     */
    updateOnbTooltipPosition(event) {
        const tooltip = document.querySelector('.onb-tooltip');
        if (!tooltip || !tooltip.classList.contains('visible')) return;
        
        const padding = 15;
        let x = event.clientX + padding;
        let y = event.clientY + padding;
        
        // Prevent tooltip from going off screen
        const rect = tooltip.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = event.clientX - rect.width - padding;
        }
        if (y + rect.height > window.innerHeight) {
            y = event.clientY - rect.height - padding;
        }
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
    
    /**
     * Set the current mod (lightweight operation - just updates reference)
     * This should be called instead of onFileProcessed when switching between already-loaded mods
     */
    setCurrentMod(mod) {
        this.currentMod = mod;
        this.zipArchive = mod?.zipArchive || null;
        this.needsRender = true;
    }
    
    /**
     * Called when a mod file is processed for the FIRST time
     * Subclasses can override to handle mod-specific updates
     */
    async onFileProcessed(mod) {
        this.currentMod = mod;
        this.needsRender = true;
        
        // Load zip archive if available and not already cached
        if (mod.fileData && !mod.zipArchive) {
            try {
                mod.zipArchive = await JSZip.loadAsync(mod.fileData);
                this.zipArchive = mod.zipArchive;
            } catch (error) {
                console.error('Failed to load zip:', error);
                this.zipArchive = null;
                mod.zipArchive = null;
            }
        } else if (mod.zipArchive) {
            // Use cached zip archive
            this.zipArchive = mod.zipArchive;
        }
    }
    
    /**
     * Render the tab content
     * Subclasses must override this
     */
    render() {
        throw new Error('render() must be implemented by subclass');
    }
    
    /**
     * Clear the tab state and UI
     * Subclasses can override to add specific cleanup
     */
    clear() {
        this.currentMod = null;
        this.zipArchive = null;
        if (this.container) {
            this.container.innerHTML = '<div class="empty-state">No data available</div>';
        }
    }
    
    /**
     * Add event listener and track it for cleanup
     */
    addEventListener(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
    }
    
    /**
     * Find multiple elements and add listeners
     */
    addEventListeners(selector, event, handler) {
        if (!this.container) return;
        this.container.querySelectorAll(selector).forEach(el => {
            this.addEventListener(el, event, handler);
        });
    }
    
    /**
     * Get single element within container
     */
    querySelector(selector) {
        return this.container?.querySelector(selector);
    }
    
    /**
     * Get multiple elements within container
     */
    querySelectorAll(selector) {
        return this.container?.querySelectorAll(selector) || [];
    }
    
    /**
     * Set inner HTML safely
     */
    setHTML(selector, html) {
        const element = this.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    /**
     * Show empty state message
     */
    showEmptyState(message = 'No data available') {
        if (this.container) {
            this.container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
        }
    }
    
    // ============ Utility Methods ============
    
    /**
     * Simple Lua syntax highlighting
     * @param {string} code - The code to highlight
     * @param {string} language - The language (lua or animation)
     * @param {Object} metadata - Optional metadata with lua globals for enhanced highlighting
     */
    syntaxHighlight(code, language = 'lua', metadata = null) {
        let highlighted;
        
        // Store metadata for tooltip lookups
        if (metadata?.lua) {
            this.luaMetadata = metadata.lua;
        }
        
        if (language === 'lua') {
            // First, mark comments and strings with placeholders to protect them (BEFORE escapeHtml)
            const commentPlaceholders = [];
            const stringPlaceholders = [];
            let commentIndex = 0;
            let stringIndex = 0;
            
            // Protect double-quoted strings BEFORE HTML escaping
            code = code.replace(/"[^"]*"/g, (match) => {
                const placeholder = `__STRING_DQ_${stringIndex}__`;
                stringPlaceholders.push({
                    placeholder,
                    html: `<span class="hljs-string">${escapeHtml(match)}</span>`
                });
                stringIndex++;
                return placeholder;
            });
            
            // Protect single-quoted strings BEFORE HTML escaping
            code = code.replace(/'[^']*'/g, (match) => {
                const placeholder = `__STRING_SQ_${stringIndex}__`;
                stringPlaceholders.push({
                    placeholder,
                    html: `<span class="hljs-string">${escapeHtml(match)}</span>`
                });
                stringIndex++;
                return placeholder;
            });
            
            // Now escape HTML (this will escape <, >, & but not our placeholders)
            highlighted = escapeHtml(code);
            
            // Multi-line comments: --[[ ... ]] (with any trailing characters)
            highlighted = highlighted.replace(/--\[\[([\s\S]*?)\]\].*$/gm, (match) => {
                const placeholder = `__COMMENT_ML_${commentIndex}__`;
                commentPlaceholders.push({ 
                    placeholder, 
                    html: `<span class="hljs-comment">${match}</span>` 
                });
                commentIndex++;
                return placeholder;
            });
            
            // Single-line comments: -- ...
            highlighted = highlighted.replace(/(--.*$)/gm, (match) => {
                const placeholder = `__COMMENT_SL_${commentIndex}__`;
                commentPlaceholders.push({ 
                    placeholder, 
                    html: `<span class="hljs-comment">${match}</span>` 
                });
                commentIndex++;
                return placeholder;
            });
            
            // Now apply other syntax highlighting (keywords, etc.)
            
            // ONB-specific keywords from metadata (apply FIRST to prioritize over standard Lua)
            if (metadata?.lua) {
                // Global functions (unique color)
                if (metadata.lua.functions) {
                    metadata.lua.functions.forEach(fn => {
                        // Avoid matching inside existing HTML tags
                        const regex = new RegExp(`(?<!<[^>]*?)\\b(${escapeRegex(fn)})\\b(?![^<]*?>)`, 'g');
                        highlighted = highlighted.replace(regex, `<span class="hljs-onb-function" data-onb-type="function" data-onb-name="${escapeAttribute(fn)}">$1</span>`);
                    });
                }
                
                // Global tables (unique color)
                if (metadata.lua.tables) {
                    Object.keys(metadata.lua.tables).forEach(table => {
                        const regex = new RegExp(`(?<!<[^>]*?)\\b(${escapeRegex(table)})\\b(?![^<]*?>)`, 'g');
                        highlighted = highlighted.replace(regex, `<span class="hljs-onb-table" data-onb-type="table" data-onb-name="${escapeAttribute(table)}">$1</span>`);
                    });
                    
                    // Highlight enum/table field values (e.g., Element.Fire, Rank.V5)
                    Object.entries(metadata.lua.tables).forEach(([tableName, fields]) => {
                        if (fields && fields.length > 0) {
                            fields.forEach(field => {
                                // Match TableName.FieldName pattern
                                const regex = new RegExp(`(?<!<[^>]*?)\\b${escapeRegex(tableName)}\\.([\\s]*)(${escapeRegex(field)})\\b(?![^<]*?>)`, 'g');
                                highlighted = highlighted.replace(regex, `<span class="hljs-onb-table" data-onb-type="table" data-onb-name="${escapeAttribute(tableName)}">${tableName}</span>.$1<span class="hljs-onb-enum-value" data-onb-type="enum-value" data-onb-name="${escapeAttribute(tableName)}" data-onb-extra="${escapeAttribute(field)}">$2</span>`);
                            });
                        }
                    });
                }
                
                // Global variables (unique color)
                if (metadata.lua.variables) {
                    metadata.lua.variables.forEach(v => {
                        const regex = new RegExp(`(?<!<[^>]*?)\\b(${escapeRegex(v)})\\b(?![^<]*?>)`, 'g');
                        highlighted = highlighted.replace(regex, `<span class="hljs-onb-variable" data-onb-type="variable" data-onb-name="${escapeAttribute(v)}">$1</span>`);
                    });
                }
                
                // Object methods (colored by type) - highlight after colon
                // Process type-specific methods first, then Common methods last to ensure they override
                if (metadata.lua.objectMethods) {
                    // Separate Common from type-specific
                    const typeSpecific = Object.entries(metadata.lua.objectMethods)
                        .filter(([typeName, _]) => typeName !== 'Common');
                    const commonMethods = metadata.lua.objectMethods.Common || [];
                    
                    // Process type-specific methods first
                    typeSpecific.forEach(([typeName, methods]) => {
                        const typeClass = `hljs-onb-method-${typeName.toLowerCase()}`;
                        methods.forEach(method => {
                            const regex = new RegExp(`(?<!<[^>]*?):([\\s]*)(${escapeRegex(method)})\\b(?![^<]*?>)`, 'g');
                            highlighted = highlighted.replace(regex, `:$1<span class="${typeClass}" data-onb-type="method" data-onb-name="${escapeAttribute(method)}" data-onb-extra="${escapeAttribute(typeName)}">$2</span>`);
                        });
                    });
                    
                    // Process Common methods last (will override type-specific if they were incorrectly classified)
                    commonMethods.forEach(method => {
                        // First, remove any existing method span for this method to avoid nested spans
                        const removeRegex = new RegExp(`(:)([\\s]*)<span class="hljs-onb-method-[^"]*?"[^>]*?>${escapeRegex(method)}</span>`, 'g');
                        highlighted = highlighted.replace(removeRegex, `$1$2${method}`);
                        
                        // Now apply Common class
                        const regex = new RegExp(`(?<!<[^>]*?):([\\s]*)(${escapeRegex(method)})\\b(?![^<]*?>)`, 'g');
                        highlighted = highlighted.replace(regex, `:$1<span class="hljs-onb-method-common" data-onb-type="method" data-onb-name="${escapeAttribute(method)}" data-onb-extra="Common">$2</span>`);
                    });
                }
            }
            
            // Lua standard keywords (applied after ONB keywords)
            const keywords = ['local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'for', 'while', 'do', 'repeat', 'until', 'return', 'break', 'and', 'or', 'not', 'in', 'true', 'false', 'nil'];
            keywords.forEach(keyword => {
                const regex = new RegExp(`(?<!<[^>]*?)\\b(${keyword})\\b(?![^<]*?>)`, 'g');
                highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>');
            });
            
            // Numbers
            highlighted = highlighted.replace(/(?<!<[^>]*?)\b(\d+\.?\d*)\b(?![^<]*?>)/g, '<span class="hljs-number">$1</span>');
            
            // Function calls
            highlighted = highlighted.replace(/(?<!<[^>]*?)\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\((?![^<]*?>)/g, '<span class="hljs-title function_">$1</span>(');
            
            // Restore strings first
            stringPlaceholders.forEach(({ placeholder, html }) => {
                highlighted = highlighted.replace(placeholder, html);
            });
            
            // Restore comments last
            commentPlaceholders.forEach(({ placeholder, html }) => {
                highlighted = highlighted.replace(placeholder, html);
            });
        } else if (language === 'animation') {
            // Initialize highlighted for animation files
            highlighted = escapeHtml(code);
            
            // Keywords
            const keywords = ['keyframe', 'key', 'animation', 'anim', 'point', 'true', 'false', '!image_path', '!frame_rate', '!app'];
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>');
            });
            
            // Strings (including quotes)
            highlighted = highlighted.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, '<span class="hljs-string">$1</span>');
            
            // Numbers
            highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
            
            // Attributes
            highlighted = highlighted.replace(/(\@\S+)/g, '<span class="hljs-title function_">$1</span>');
        } else if (language === 'json') {
            // Initialize highlighted for JSON files
            highlighted = escapeHtml(code);
            
            // JSON highlighting
            highlighted = highlighted.replace(/(&quot;[^&]*?&quot;):/g, '<span class="hljs-attr">$1</span>:');
            highlighted = highlighted.replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="hljs-string">$1</span>');
            highlighted = highlighted.replace(/\b(true|false|null)\b/g, '<span class="hljs-literal">$1</span>');
            highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
        } else {
            // Default case for other languages - just escape HTML
            highlighted = escapeHtml(code);
        }
        
        return highlighted;
    }
    
    /**
     * Get file icon based on extension
     */
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'lua': '📄',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️',
            'txt': '📝',
            'md': '📝',
            'json': '📋',
            'xml': '📋',
            'animation': '🎬',
            'ogg': '🔊',
            'wav': '🔊',
            'mp3': '🔊'
        };
        return icons[ext] || '📄';
    }
    
    /**
     * Find a file in the zip archive (handles subdirectories)
     */
    async findFileInZip(fileName) {
        if (!this.zipArchive) return null;
        
        // Try to find the file - it might be in a subdirectory
        for (const [path, file] of Object.entries(this.zipArchive.files)) {
            if (path.endsWith('/' + fileName) || path === fileName) {
                return file;
            }
        }
        return null;
    }
    
    /**
     * Download a file to user's computer
     */
    downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = createElement('a', {
            attributes: { href: url, download: filename }
        });
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show a success message with visual feedback on a button
     */
    showButtonSuccess(button, message = '✓ Success!', duration = 2000) {
        if (!button) return;
        
        const originalText = button.textContent;
        const originalBackground = button.style.background;
        
        button.textContent = message;
        button.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = originalBackground;
        }, duration);
    }
}
