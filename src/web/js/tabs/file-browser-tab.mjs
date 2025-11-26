// File Browser Tab - Displays mod file structure and contents

import * as parser from '../parser.mjs';

export default class FileBrowserTab {
    constructor() {
        this.container = null;
        this.currentMod = null;
        this.zipArchive = null;
        this.selectedFile = null;
    }
    
    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="file-browser">
                <div class="file-tree-container">
                    <h3>Files</h3>
                    <div id="file-tree" class="file-tree"></div>
                </div>
                <div class="file-preview-container">
                    <div class="file-preview-header">
                        <h3 id="preview-filename">Select a file</h3>
                    </div>
                    <div id="file-preview" class="file-preview"></div>
                </div>
            </div>
        `;
    }
    
    async onFileProcessed(mod) {
        this.currentMod = mod;
        
        if (mod.fileData) {
            try {
                this.zipArchive = await JSZip.loadAsync(mod.fileData);
            } catch (error) {
                console.error('Failed to load zip:', error);
                this.zipArchive = null;
            }
        }
    }
    
    render() {
        if (!this.currentMod || !this.zipArchive) {
            this.container.querySelector('#file-tree').innerHTML = 
                '<div class="empty-state">No files available</div>';
            this.container.querySelector('#file-preview').innerHTML = '';
            return;
        }
        
        this.renderFileTree();
    }
    
    renderFileTree() {
        const tree = this.buildFileTree();
        const html = this.renderTreeNode(tree);
        this.container.querySelector('#file-tree').innerHTML = html;
        
        // Add click handlers
        this.container.querySelectorAll('.file-tree-item[data-path]').forEach(item => {
            item.addEventListener('click', () => {
                this.selectFile(item.dataset.path);
            });
        });
    }
    
    buildFileTree() {
        const tree = { name: 'root', children: {}, type: 'folder' };
        
        Object.keys(this.zipArchive.files).forEach(path => {
            const parts = path.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (!part) return; // Skip empty parts
                
                if (index === parts.length - 1 && !path.endsWith('/')) {
                    // It's a file
                    current.children[part] = {
                        name: part,
                        path: path,
                        type: 'file'
                    };
                } else {
                    // It's a folder
                    if (!current.children[part]) {
                        current.children[part] = {
                            name: part,
                            children: {},
                            type: 'folder'
                        };
                    }
                    current = current.children[part];
                }
            });
        });
        
        return tree;
    }
    
    renderTreeNode(node, level = 0) {
        if (node.type === 'file') {
            const icon = this.getFileIcon(node.name);
            return `
                <div class="file-tree-item" data-path="${node.path}" style="padding-left: ${level * 20}px">
                    ${icon} ${node.name}
                </div>
            `;
        }
        
        const children = Object.values(node.children);
        if (children.length === 0) return '';
        
        const childrenHtml = children.map(child => this.renderTreeNode(child, level + 1)).join('');
        
        if (level === 0) {
            return childrenHtml;
        }
        
        return `
            <div class="file-tree-folder" style="padding-left: ${level * 20}px">
                <div class="folder-header">📁 ${node.name}</div>
                <div class="folder-children">${childrenHtml}</div>
            </div>
        `;
    }
    
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
    
    async selectFile(path) {
        this.selectedFile = path;
        
        // Update active state
        this.container.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === path);
        });
        
        // Update header
        const filename = path.split('/').pop();
        this.container.querySelector('#preview-filename').textContent = filename;
        
        // Load and display file
        const file = this.zipArchive.files[path];
        if (!file) return;
        
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
            await this.displayImage(file);
        } else if (['lua', 'txt', 'md', 'json', 'xml', 'animation'].includes(ext)) {
            await this.displayText(file, ext);
        } else {
            this.displayBinary(file);
        }
    }
    
    async displayImage(file) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        
        this.container.querySelector('#file-preview').innerHTML = `
            <div class="image-preview">
                <img src="${url}" alt="Preview" style="max-width: 100%; height: auto;" />
            </div>
        `;
    }
    
    async displayText(file, ext) {
        const content = await file.async('string');
        const errors = this.getErrorsForFile(this.selectedFile);
        
        const lines = content.split('\n');
        const lineNumbersHtml = lines.map((_, i) => i + 1).join('\n');
        
        let linesHtml = lines.map((line, index) => {
            const lineNum = index + 1;
            const hasError = errors.some(e => e.line === lineNum);
            const errorClass = hasError ? 'error-line' : '';
            const escapedLine = this.escapeHtml(line);
            
            return `<div class="code-line ${errorClass}" data-line="${lineNum}">${escapedLine}</div>`;
        }).join('\n');
        
        this.container.querySelector('#file-preview').innerHTML = `
            <div class="code-preview">
                <div class="line-numbers">${lineNumbersHtml}</div>
                <div class="code-content">
                    <pre><code class="language-${ext}">${linesHtml}</code></pre>
                </div>
            </div>
        `;
        
        // Apply syntax highlighting
        if (window.hljs) {
            this.container.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        
        // Add error tooltips
        if (errors.length > 0) {
            this.addErrorTooltips(errors);
        }
    }
    
    displayBinary(file) {
        this.container.querySelector('#file-preview').innerHTML = `
            <div class="binary-preview">
                <p>Binary file (${file._data.uncompressedSize} bytes)</p>
                <button class="btn" onclick="this.download()">Download</button>
            </div>
        `;
    }
    
    getErrorsForFile(path) {
        if (!this.currentMod || !this.currentMod.errors) return [];
        
        return this.currentMod.errors
            .map(e => {
                const loc = parser.parseErrorLocation(e.message);
                return loc && loc.file === path.split('/').pop() ? { ...e, ...loc } : null;
            })
            .filter(e => e !== null);
    }
    
    addErrorTooltips(errors) {
        errors.forEach(error => {
            const line = this.container.querySelector(`.code-line[data-line="${error.line}"]`);
            if (line) {
                line.title = error.message;
                line.style.cursor = 'help';
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    clear() {
        this.currentMod = null;
        this.zipArchive = null;
        this.selectedFile = null;
        
        if (this.container) {
            this.container.querySelector('#file-tree').innerHTML = 
                '<div class="empty-state">No files</div>';
            this.container.querySelector('#file-preview').innerHTML = '';
        }
    }
}
