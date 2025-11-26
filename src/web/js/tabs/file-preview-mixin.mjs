// FilePreviewMixin - Shared file preview and tooltip functionality

export const FilePreviewMixin = {
    // State for preview tooltips
    previewTooltip: null,
    
    /**
     * Show a file preview tooltip
     */
    async showFilePreview(event, showErrors = false) {
        const fileName = event.target.dataset.file;
        if (!fileName) return;
        
        const file = await this.findFileInZip(fileName);
        if (!file) return;
        
        const ext = fileName.split('.').pop().toLowerCase();
        let previewHtml;
        
        // Render based on file type
        if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
            previewHtml = await this.renderImagePreview(file, fileName);
        } else if (['lua', 'txt', 'md', 'json', 'xml', 'animation'].includes(ext)) {
            if (showErrors) {
                const errors = this.extractErrorsForFile(fileName);
                previewHtml = await this.renderTextPreviewWithErrors(file, fileName, ext, errors);
            } else {
                previewHtml = await this.renderTextPreview(file, fileName, ext);
            }
        } else if (['ogg', 'wav', 'mp3'].includes(ext)) {
            previewHtml = await this.renderAudioPreview(file, fileName);
        } else {
            previewHtml = this.renderBinaryPreview(file, fileName);
        }
        
        this.showTooltip(event.target, previewHtml);
    },
    
    /**
     * Render image preview
     */
    async renderImagePreview(file, fileName) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        
        return `
            <div class="file-preview-tooltip">
                <div class="tooltip-header">${this.escapeHtml(fileName)}</div>
                <div class="image-preview-container">
                    <img src="${url}" alt="${this.escapeHtml(fileName)}" style="max-width: 600px; max-height: 400px; height: auto;" />
                </div>
            </div>
        `;
    },
    
    /**
     * Render audio preview
     */
    async renderAudioPreview(file, fileName) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        const ext = fileName.split('.').pop().toLowerCase();
        
        return `
            <div class="file-preview-tooltip">
                <div class="tooltip-header">${this.escapeHtml(fileName)}</div>
                <div class="audio-preview-container">
                    <audio controls autoplay style="width: 100%;">
                        <source src="${url}" type="audio/${ext}">
                        Your browser does not support the audio element.
                    </audio>
                    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">Audio will play automatically</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Render binary file preview
     */
    renderBinaryPreview(file, fileName) {
        const size = file._data ? file._data.uncompressedSize : 0;
        return `
            <div class="file-preview-tooltip">
                <div class="tooltip-header">${this.escapeHtml(fileName)}</div>
                <div class="binary-preview-container">
                    <p>Binary file (${this.formatBytes(size)})</p>
                    <p>Click to open in file browser</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Render text/code preview
     */
    async renderTextPreview(file, fileName, ext, errorLine = null, errorColumn = null) {
        const content = await file.async('string');
        const lines = content.split('\n');
        
        // If we have an error line, show context around it
        if (errorLine) {
            const contextLines = 5;
            const startLine = Math.max(0, errorLine - 1 - contextLines);
            const endLine = Math.min(lines.length, errorLine + contextLines);
            const previewLines = lines.slice(startLine, endLine);
            return this.renderCodePreview(previewLines, fileName, errorLine, errorColumn, startLine + 1);
        } else {
            // Show first 20 lines for regular preview
            const maxLines = 20;
            const previewLines = lines.slice(0, maxLines);
            return this.renderCodePreview(previewLines, fileName, null, null, 1);
        }
    },
    
    /**
     * Render text preview with multiple errors highlighted
     */
    async renderTextPreviewWithErrors(file, fileName, ext, errors) {
        const content = await file.async('string');
        const lines = content.split('\n');
        
        if (errors.length === 0) {
            const maxLines = 20;
            const previewLines = lines.slice(0, maxLines);
            return this.renderCodePreview(previewLines, fileName, null, null, 1);
        }
        
        // Find min and max error lines to determine range
        const errorLines = errors.map(e => e.line);
        const minLine = Math.min(...errorLines);
        const maxLine = Math.max(...errorLines);
        
        // Show context around all errors
        const contextLines = 3;
        const startLine = Math.max(0, minLine - 1 - contextLines);
        const endLine = Math.min(lines.length, maxLine + contextLines);
        const previewLines = lines.slice(startLine, endLine);
        
        return this.renderCodePreviewWithMultipleErrors(previewLines, fileName, errors, startLine + 1);
    },
    
    /**
     * Render code preview with line numbers and optional error highlighting
     */
    renderCodePreview(lines, fileName, errorLine = null, errorColumn = null, startLineNum = 1) {
        const lineNumbersHtml = lines.map((_, i) => 
            `<div class="line-number">${startLineNum + i}</div>`
        ).join('');
        
        const linesHtml = lines.map((line, i) => {
            const lineNum = startLineNum + i;
            const isErrorLine = errorLine && lineNum === errorLine;
            const errorClass = isErrorLine ? 'error-line' : '';
            
            let lineContent = this.syntaxHighlight(line);
            
            // Add character highlight if this is the error line and we have a column
            if (isErrorLine && errorColumn && errorColumn > 0) {
                const errors = [{ line: lineNum, column: errorColumn }];
                lineContent = this.highlightErrorColumns(line, lineContent, errors);
            }
            
            return `<div class="code-line ${errorClass}" data-line="${lineNum}">${lineContent}</div>`;
        }).join('');
        
        return `
            <div class="file-preview-tooltip">
                <div class="tooltip-header">${this.escapeHtml(fileName)}</div>
                <div class="code-preview">
                    <div class="line-numbers">${lineNumbersHtml}</div>
                    <div class="code-content">${linesHtml}</div>
                </div>
            </div>
        `;
    },
    
    /**
     * Render code preview with multiple errors
     */
    renderCodePreviewWithMultipleErrors(lines, fileName, errors, startLineNum = 1) {
        const lineNumbersHtml = lines.map((_, i) => 
            `<div class="line-number">${startLineNum + i}</div>`
        ).join('');
        
        const codeHtml = lines.map((line, i) => {
            const currentLineNum = startLineNum + i;
            const lineErrors = errors.filter(e => e.line === currentLineNum);
            const isErrorLine = lineErrors.length > 0;
            
            let processedLine = this.syntaxHighlight(line);
            
            // Add column markers for each error on this line
            if (isErrorLine && lineErrors.length > 0) {
                processedLine = this.highlightErrorColumns(line, processedLine, lineErrors);
            }
            
            const errorClass = isErrorLine ? ' error-line' : '';
            return `<div class="code-line${errorClass}">${processedLine}</div>`;
        }).join('');
        
        const errorCount = errors.length;
        const errorSummary = errorCount > 0 ? 
            `<div class="tooltip-error-summary">${errorCount} error${errorCount > 1 ? 's' : ''} in this file</div>` : '';
        
        return `
            <div class="file-preview-tooltip">
                <div class="tooltip-header">${this.escapeHtml(fileName)}</div>
                ${errorSummary}
                <div class="code-preview">
                    <div class="line-numbers">${lineNumbersHtml}</div>
                    <div class="code-lines">${codeHtml}</div>
                </div>
            </div>
        `;
    },
    
    /**
     * Highlight specific error column positions in a syntax-highlighted line
     * @param {string} originalLine - The original unescaped line
     * @param {string} highlightedLine - The syntax-highlighted HTML line
     * @param {Array} errors - Array of errors for this line
     * @returns {string} Line with error column markers
     */
    highlightErrorColumns(originalLine, highlightedLine, errors) {
        // Sort errors by column (descending) to insert markers from right to left
        const sortedErrors = [...errors].sort((a, b) => b.column - a.column);
        
        let result = highlightedLine;
        
        for (const error of sortedErrors) {
            const col = error.column - 1; // Convert to 0-based
            
            // Count visible characters in the original line
            if (col < 0 || col >= originalLine.length) continue;
            
            // Find the position in HTML that corresponds to this column
            const positions = this.findHtmlPositionForColumn(result, col);
            
            if (positions.start !== -1 && positions.end !== -1) {
                // Wrap the character at this position with error marker
                result = result.slice(0, positions.start) + 
                        '<span class="error-column-marker">' + 
                        result.slice(positions.start, positions.end) + 
                        '</span>' + 
                        result.slice(positions.end);
            }
        }
        
        return result;
    },
    
    /**
     * Find the HTML position that corresponds to a specific column in the original text
     * @param {string} html - The HTML string with syntax highlighting
     * @param {number} targetColumn - The column position (0-based)
     * @returns {Object} {start, end} positions in HTML string for the character
     */
    findHtmlPositionForColumn(html, targetColumn) {
        let visibleChars = 0;
        let inTag = false;
        
        for (let i = 0; i < html.length; i++) {
            const char = html[i];
            
            if (char === '<') {
                inTag = true;
            } else if (char === '>') {
                inTag = false;
            } else if (!inTag) {
                // This is a visible character
                if (visibleChars === targetColumn) {
                    // Find the end of this character (next tag or next character)
                    let end = i + 1;
                    // Handle HTML entities like &lt; &gt; &amp;
                    if (char === '&') {
                        while (end < html.length && html[end] !== ';') {
                            end++;
                        }
                        if (end < html.length) end++; // Include the semicolon
                    }
                    return { start: i, end: end };
                }
                visibleChars++;
            }
        }
        
        return { start: -1, end: -1 };
    },
    
    /**
     * Show a tooltip at the target element's position
     */
    showTooltip(element, content) {
        this.hidePreview();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'hover-preview-tooltip';
        tooltip.innerHTML = content;
        document.body.appendChild(tooltip);
        
        // Set volume for audio elements
        const audioElement = tooltip.querySelector('audio');
        if (audioElement) {
            audioElement.volume = 0.5;
        }
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        // Adjust if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
        }
        
        this.previewTooltip = tooltip;
    },
    
    /**
     * Hide the current preview tooltip
     */
    hidePreview() {
        if (this.previewTooltip) {
            this.previewTooltip.remove();
            this.previewTooltip = null;
        }
        
        // Remove highlights
        if (this.container) {
            this.container.querySelectorAll('.highlighted').forEach(el => {
                el.classList.remove('highlighted');
            });
        }
    },
    
    /**
     * Extract errors for a specific file from stderr
     */
    /**
     * Extract errors for a specific file
     * Delegates to ErrorManager if available, otherwise returns empty array
     * @param {string} fileName - The file to get errors for
     * @returns {Array} Array of error objects {line, column, message}
     */
    extractErrorsForFile(fileName) {
        // Use ErrorManager if available (injected by tab)
        if (this.errorManager) {
            return this.errorManager.getErrorsForFile(fileName);
        }
        
        // Fallback: no errors if ErrorManager not available
        console.warn('ErrorManager not available for FilePreviewMixin');
        return [];
    }

};
