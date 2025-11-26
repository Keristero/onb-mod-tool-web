// BaseTab - Common functionality for all tab components

export default class BaseTab {
    constructor() {
        this.container = null;
        this.currentMod = null;
        this.zipArchive = null;
    }
    
    /**
     * Initialize the tab with a container element
     * Subclasses should override to set up their specific UI
     */
    async init(container) {
        this.container = container;
    }
    
    /**
     * Called when a mod file is processed
     * Subclasses can override to handle mod-specific updates
     */
    async onFileProcessed(mod) {
        this.currentMod = mod;
        
        // Load zip archive if available
        if (mod.fileData) {
            try {
                this.zipArchive = await JSZip.loadAsync(mod.fileData);
            } catch (error) {
                console.error('Failed to load zip:', error);
                this.zipArchive = null;
            }
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
            this.container.innerHTML = `<div class="empty-state">${this.escapeHtml(message)}</div>`;
        }
    }
    
    // ============ Utility Methods ============
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    /**
     * Escape XML special characters
     */
    escapeXml(text) {
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
     * Format bytes to human-readable size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Simple Lua syntax highlighting
     */
    syntaxHighlight(code, language = 'lua') {
        let highlighted = this.escapeHtml(code);
        
        if (language === 'lua') {
            // Keywords
            const keywords = ['local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'for', 'while', 'do', 'repeat', 'until', 'return', 'break', 'and', 'or', 'not', 'in', 'true', 'false', 'nil'];
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>');
            });
            
            // Strings (including quotes)
            highlighted = highlighted.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, '<span class="hljs-string">$1</span>');
            
            // Numbers
            highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
            
            // Comments
            highlighted = highlighted.replace(/(--.*$)/gm, '<span class="hljs-comment">$1</span>');
            
            // Function calls
            highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="hljs-title function_">$1</span>(');
        } else if (language === 'ani') {
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
            
            // Comments
            highlighted = highlighted.replace(/(#.*$)/gm, '<span class="hljs-comment">$1</span>');
            
            // Attributes
            highlighted = highlighted.replace(/(\@\S+)/g, '<span class="hljs-title function_">$1</span>');
        } else if (language === 'json') {
            // JSON highlighting
            highlighted = highlighted.replace(/(&quot;[^&]*?&quot;):/g, '<span class="hljs-attr">$1</span>:');
            highlighted = highlighted.replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="hljs-string">$1</span>');
            highlighted = highlighted.replace(/\b(true|false|null)\b/g, '<span class="hljs-literal">$1</span>');
            highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
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
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
