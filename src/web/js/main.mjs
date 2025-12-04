// Main application entry point

import * as parser from './parser.mjs';
import { ErrorManager } from './tabs/error-manager.mjs';
import { createDefaultRegistry } from './validation.mjs';
import ResultsTab from './tabs/results-tab.mjs';
import FileBrowserTab from './tabs/file-browser-tab.mjs';
import StatisticsTab from './tabs/statistics-tab.mjs';
import DependenciesTab from './tabs/dependencies-tab.mjs';

class ModAnalyzer {
    constructor() {
        this.worker = null;
        this.workerReady = false;
        this.currentVersion = 'latest';
        this.processedMods = [];
        this.currentModIndex = -1;
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Performance optimization flags
        this.renderDebounceTimer = null;
        
        // Validation registry
        this.validationRegistry = createDefaultRegistry();
        
        // Tab modules
        this.tabs = {
            results: new ResultsTab(),
            files: new FileBrowserTab(),
            statistics: new StatisticsTab(),
            dependencies: new DependenciesTab(this) // Pass app reference
        };
        
        this.init();
    }
    
    async init() {
        // Initialize DOM elements
        this.elements = {
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            mainContent: document.getElementById('main-content'),
            modList: document.getElementById('mod-list'),
            modFilter: document.getElementById('mod-filter'),
            clearHistory: document.getElementById('clear-history'),
            versionSelect: document.getElementById('version-select'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            tabButtons: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            subTabButtons: document.querySelectorAll('.sub-tab'),
            subTabContents: document.querySelectorAll('.sub-tab-content')
        };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize tabs
        for (const [name, tab] of Object.entries(this.tabs)) {
            const container = document.getElementById(`tab-${name}`).querySelector('.tab-panel');
            await tab.init(container);
        }
        
        // Load available versions
        await this.loadVersions();
        
        // Initialize worker
        await this.initWorker();
        
        // Load saved state
        this.loadState();
    }
    
    setupEventListeners() {
        // File upload
        this.elements.dropZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop
        this.elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.add('drag-over');
        });
        
        this.elements.dropZone.addEventListener('dragleave', () => {
            this.elements.dropZone.classList.remove('drag-over');
        });
        
        this.elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // Mod filter
        this.elements.modFilter.addEventListener('input', (e) => {
            this.filterMods(e.target.value);
        });
        
        // Clear history
        this.elements.clearHistory.addEventListener('click', () => {
            if (confirm('Clear all processed mods?')) {
                this.clearHistory();
            }
        });
        
        // Version selector
        this.elements.versionSelect.addEventListener('change', (e) => {
            this.switchVersion(e.target.value);
        });
        
        // Tab switching
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
        
        // Sub-tab switching
        this.elements.subTabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSubTab(btn.dataset.subTab);
            });
        });
    }
    
    async loadVersions() {
        try {
            // Get the base path for the site (handles both local and GitHub Pages)
            const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
            const versionsPath = basePath ? `${basePath}/versions/index.json` : 'versions/index.json';
            
            const response = await fetch(versionsPath);
            const versions = await response.json();
            
            if (versions.length === 0) {
                // Fallback to latest if no versions exist
                this.elements.versionSelect.innerHTML = '<option value="latest">Latest</option>';
                this.currentVersion = 'latest';
                return;
            }
            
            // Sort versions by semver (highest first)
            const sortedVersions = versions.sort((a, b) => {
                const aVer = a.version.replace(/^v/, '').split('.').map(Number);
                const bVer = b.version.replace(/^v/, '').split('.').map(Number);
                
                for (let i = 0; i < 3; i++) {
                    if (aVer[i] !== bVer[i]) return bVer[i] - aVer[i];
                }
                return 0;
            });
            
            // The first version in sorted list is the latest
            const latestVersion = sortedVersions[0].version;
            this.currentVersion = latestVersion;
            
            this.elements.versionSelect.innerHTML = sortedVersions.map(v => 
                `<option value="${v.version}" ${v.version === latestVersion ? 'selected' : ''}>
                    ${v.version}${v.version === latestVersion ? ' (Latest)' : ''}
                </option>`
            ).join('');
        } catch (error) {
            console.warn('Could not load versions, using default');
            this.elements.versionSelect.innerHTML = '<option value="latest">Latest</option>';
            this.currentVersion = 'latest';
        }
    }
    
    async initWorker() {
        this.showLoading('Initializing analyzer...');
        
        try {
            await this.createWorker();
            this.workerReady = true;
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            alert('Failed to initialize: ' + error.message);
        }
    }
    
    async createWorker() {
        // Terminate existing worker if any
        if (this.worker) {
            this.worker.terminate();
        }
        
        this.worker = new Worker('./js/worker.mjs', { type: 'module' });
        
        this.worker.addEventListener('message', (event) => {
            this.handleWorkerMessage(event.data);
        });
        
        // Wait for worker ready
        await new Promise((resolve) => {
            const handler = (event) => {
                if (event.data.type === 'worker-ready') {
                    this.worker.removeEventListener('message', handler);
                    resolve();
                }
            };
            this.worker.addEventListener('message', handler);
        });
        
        // Initialize WASM
        await this.sendWorkerMessage('init', { version: this.currentVersion });
    }
    
    async reinitWorker() {
        this.workerReady = false;
        try {
            await this.createWorker();
            this.workerReady = true;
        } catch (error) {
            console.error('Failed to reinitialize worker:', error);
            throw error;
        }
    }
    
    async sendWorkerMessage(type, payload) {
        return new Promise((resolve, reject) => {
            const id = Date.now() + Math.random();
            
            const handler = (event) => {
                if (event.data.id === id) {
                    this.worker.removeEventListener('message', handler);
                    resolve(event.data.payload);
                }
            };
            
            this.worker.addEventListener('message', handler);
            this.worker.postMessage({ type, payload, id });
            
            // Timeout after 2 seconds
            setTimeout(() => {
                this.worker.removeEventListener('message', handler);
                const error = new Error('Worker timeout - parsing took longer than 2 seconds');
                error.isTimeout = true; // Mark as timeout for worker recreation
                reject(error);
            }, 2000);
        });
    }
    
    handleWorkerMessage(data) {
        // Handle worker messages that don't need response promises
        if (data.type === 'init-complete') {
            // WASM initialized successfully
        }
    }
    
    async handleFiles(files) {
        const zipFiles = Array.from(files).filter(f => f.name.endsWith('.zip'));
        
        if (zipFiles.length === 0) {
            alert('Please select .zip mod files');
            return;
        }
        
        // Add to queue
        for (const file of zipFiles) {
            this.processingQueue.push(file);
        }
        
        // Start processing if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        // Show main content
        this.elements.mainContent.style.display = 'grid';
    }
    
    async processQueue() {
        if (this.processingQueue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        const file = this.processingQueue.shift();
        
        await this.processFile(file);
        
        // Process next
        this.processQueue();
    }
    
    async processFile(file) {
        const modId = Date.now() + Math.random();
        
        this.showLoading(`Processing ${file.name}...`);
        
        // Read file first (before try block) so we always have the arrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            // Process with worker
            const result = await this.sendWorkerMessage('process', {
                fileName: file.name,
                fileSize: file.size,
                fileData: arrayBuffer,
                options: {}
            });
            
            // Create mod data with all information
            const modData = {
                id: modId,
                fileName: file.name,
                fileSize: file.size,
                fileData: arrayBuffer,
                result: result,
                parsed: parser.parseAnalysisResult(result),
                errors: parser.extractErrors(result.stderr),
                processingTime: result.processingTime,
                timestamp: new Date()
            };
            
            // Pre-parse errors once and cache on mod object
            const errorManager = new ErrorManager();
            if (result.stderr) {
                errorManager.parseErrors(result.stderr);
                modData.errorsByFile = new Map(errorManager.errorsByFile);
            } else {
                modData.errorsByFile = new Map();
            }
            
            // Run validation once using validation registry
            modData.validationResult = this.validationRegistry.validate(modData);
            
            // Derive status from validation result
            const hasAnalyzerError = modData.validationResult.byField.has('analyzer');
            const hasParserError = hasAnalyzerError; // Analyzer errors include parser failures
            
            if (hasParserError) {
                modData.status = 'failed';
                // Set error message from analyzer validation
                const analyzerIssues = modData.validationResult.byField.get('analyzer');
                if (analyzerIssues && analyzerIssues.length > 0 && !modData.error) {
                    modData.error = analyzerIssues[0].message;
                }
            } else if (modData.validationResult.hasErrors()) {
                modData.status = 'validation-failed';
            } else {
                modData.status = 'success';
            }
            
            // Backward compatibility: maintain old validationErrors format
            // Include all validation errors except analyzer errors (which are shown separately)
            modData.validationErrors = modData.validationResult.bySeverity.error
                .filter(issue => issue.field !== 'analyzer')
                .map(issue => ({
                    field: issue.field,
                    message: issue.message
                }));
            
            // Derive error categories from validation result
            modData.errorCategories = {
                validation: modData.validationErrors,
                analyzer: modData.validationResult.byField.get('analyzer') || [],
                stderr: modData.errors || [],
                other: []
            };
            
            // Mark as validated
            modData.validationComplete = true;
            
            // Add to processed mods list and select it
            this.processedMods.unshift(modData);
            
            // Select this mod (it's at index 0 since we used unshift) - this will trigger validation
            await this.selectMod(0);
            
            // Render the list after validation is complete
            this.renderModList();
            
            // Save state
            this.saveState();
            
        } catch (error) {
            console.error('Processing error:', error);
            
            // If timeout occurred, recreate the worker
            if (error.isTimeout) {
                try {
                    await this.reinitWorker();
                } catch (reinitError) {
                    console.error('Failed to reinitialize worker after timeout:', reinitError);
                }
            }
            
            // Create failed mod data with empty result/parsed objects to avoid errors in display
            const modData = {
                id: modId,
                fileName: file.name,
                fileSize: file.size,
                fileData: arrayBuffer, // Include fileData so file browser can access it
                status: 'failed',
                error: error.message,
                timestamp: new Date(),
                result: {
                    stderr: error.message,
                    stdout: '',
                    data: {},
                    processingTime: 0,
                    success: false,
                    error: error.message
                },
                parsed: {
                    name: 'unknown',
                    id: 'unknown',
                    uuid: 'unknown',
                    game: 'unknown',
                    version: '0.0.0',
                    category: 'err',
                    path: '',
                    stderr: error.message
                },
                errors: [],
                errorsByFile: new Map()
            };
            
            // Run validation on failed mod too
            modData.validationResult = this.validationRegistry.validate(modData);
            
            // Backward compatibility
            modData.validationErrors = [];
            modData.errorCategories = {
                validation: [],
                analyzer: modData.validationResult.byField.get('analyzer') || [],
                stderr: [],
                other: []
            };
            modData.validationComplete = true;
            
            this.processedMods.unshift(modData);
            this.renderModList();
        } finally {
            this.hideLoading();
        }
    }
    
    renderModList() {
        // Debounce rendering for better performance with many mods
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        this.renderDebounceTimer = setTimeout(() => {
            this._renderModListImmediate();
        }, 16); // ~60fps
    }
    
    _renderModListImmediate() {
        const filtered = this.getFilteredMods();
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        
        // Batch create elements
        filtered.forEach(mod => {
            const actualIndex = this.processedMods.indexOf(mod);
            const statusClass = mod.status;
            const activeClass = actualIndex === this.currentModIndex ? 'active' : '';
            const category = mod.parsed?.category || 'unknown';
            const categoryClass = `mod-category-${category.toLowerCase()}`;
            
            const statusText = {
                'processing': 'Processing...',
                'success': `Success (${mod.processingTime ? parser.formatDuration(mod.processingTime) : ''})`,
                'validation-failed': `Validation Issue (${mod.processingTime ? parser.formatDuration(mod.processingTime) : ''})`,
                'failed': 'Fail'
            }[mod.status] || mod.status;
            
            const el = document.createElement('div');
            el.className = `mod-item ${statusClass} ${activeClass} ${categoryClass}`;
            el.dataset.index = actualIndex;
            el.innerHTML = `
                <div class="mod-item-name" title="${mod.fileName}">${mod.fileName}</div>
                <div class="mod-item-status">${statusText}</div>
            `;
            
            // Add click handler directly
            el.addEventListener('click', () => this.selectMod(actualIndex));
            fragment.appendChild(el);
        });
        
        // Replace content in one operation
        this.elements.modList.innerHTML = '';
        this.elements.modList.appendChild(fragment);
    }
    
    getFilteredMods() {
        const filter = this.elements.modFilter.value.toLowerCase();
        if (!filter) return this.processedMods;
        
        return this.processedMods.filter(mod => 
            mod.fileName.toLowerCase().includes(filter)
        );
    }
    
    filterMods(query) {
        this.renderModList();
    }
    
    async selectMod(index) {
        this.currentModIndex = index;
        const mod = this.processedMods[index];
        
        if (!mod) return;
        
        this.renderModList();
        
        // Determine if this is the first time loading this mod
        const needsProcessing = !mod.tabsInitialized;
        
        if (needsProcessing) {
            // First time loading this mod - call onFileProcessed on all tabs
            const promises = [];
            for (const tab of Object.values(this.tabs)) {
                promises.push(tab.onFileProcessed(mod));
            }
            await Promise.all(promises);
            mod.tabsInitialized = true;
        } else {
            // Mod already loaded - just update the current mod reference (lightweight)
            for (const tab of Object.values(this.tabs)) {
                tab.setCurrentMod(mod);
            }
        }
        
        // Only render the currently active tab immediately
        const activeTab = document.querySelector('.tab.active')?.dataset.tab;
        if (activeTab && this.tabs[activeTab]) {
            this.tabs[activeTab].render();
            this.tabs[activeTab].needsRender = false;
        }
        
        // Don't render inactive tabs - they will render when switched to
    }
    
    switchTab(tabName) {
        // Update buttons
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        this.elements.tabContents.forEach(content => {
            const isActive = content.id === `tab-${tabName}`;
            content.classList.toggle('active', isActive);
        });
        
        // Only render the tab if we have a current mod and it needs rendering
        if (this.currentModIndex !== null && this.tabs[tabName]) {
            // Call onShow if the tab implements it
            if (typeof this.tabs[tabName].onShow === 'function') {
                this.tabs[tabName].onShow();
            } else if (this.tabs[tabName].needsRender) {
                this.tabs[tabName].render();
                this.tabs[tabName].needsRender = false;
            }
        }
    }
    
    switchSubTab(subTabName) {
        // Determine parent tab (statistics or dependencies)
        const parentTab = subTabName.split('-')[0];
        
        // Update sub-tab buttons for this parent
        const parentContainer = document.getElementById(`tab-${parentTab}`);
        if (parentContainer) {
            const subTabButtons = parentContainer.querySelectorAll('.sub-tab');
            subTabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.subTab === subTabName);
            });
            
            // Update sub-tab content
            const subTabContents = parentContainer.querySelectorAll('.sub-tab-content');
            subTabContents.forEach(content => {
                const isActive = content.id === `sub-tab-${subTabName}`;
                content.classList.toggle('active', isActive);
            });
        }
        
        // Re-render the parent tab to ensure both views are updated
        this.tabs[parentTab].render();
    }
    
    async switchVersion(version) {
        this.showLoading(`Switching to version ${version}...`);
        
        try {
            await this.sendWorkerMessage('switch-version', { version });
            this.currentVersion = version;
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            alert('Failed to switch version: ' + error.message);
        }
    }
    
    clearHistory() {
        this.processedMods = [];
        this.currentModIndex = -1;
        this.renderModList();
        
        // Clear all tabs
        for (const tab of Object.values(this.tabs)) {
            tab.clear();
        }
        
        this.elements.mainContent.style.display = 'none';
        this.saveState();
    }
    
    showLoading(text = 'Loading...') {
        this.elements.loadingText.textContent = text;
        this.elements.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }
    
    saveState() {
        try {
            // Only save metadata, not file data
            const metadata = this.processedMods.map(mod => ({
                fileName: mod.fileName,
                fileSize: mod.fileSize,
                status: mod.status,
                timestamp: mod.timestamp,
                parsed: mod.parsed
            }));
            
            localStorage.setItem('modAnalyzer:mods', JSON.stringify(metadata));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('modAnalyzer:mods');
            if (saved) {
                const metadata = JSON.parse(saved);
                // Show in list but mark as needing re-analysis
                // (we don't save file data)
            }
        } catch (error) {
            console.warn('Failed to load state:', error);
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ModAnalyzer();
    });
} else {
    new ModAnalyzer();
}
