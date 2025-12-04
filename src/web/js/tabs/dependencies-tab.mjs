// Dependencies Tab - Visualizes mod dependency graph

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';

export default class DependenciesTab extends BaseTab {
    constructor(app = null) {
        super();
        this.app = app; // Reference to main app for tab switching
        this.sessionMods = []; // Reset on page load
        this.fileContainer = null;
        this.sessionContainer = null;
        this.fileGraph = null;
        this.sessionGraph = null;
        this.fileContentCache = new Map(); // Cache for loaded file contents
        this.fileTreeCache = new Map(); // Cache for built file trees
    }
    
    async init(container) {
        // Don't call super.init since we have two containers
        this.container = container;
        
        // Get both sub-tab containers
        this.fileContainer = document.querySelector('#sub-tab-dependencies-file .tab-panel');
        this.sessionContainer = document.querySelector('#sub-tab-dependencies-session .tab-panel');
        
        // Initialize file view
        this.fileContainer.innerHTML = `
            <div class="dependencies-view">
                <div class="dependencies-header">
                    <h2>Current File Dependencies</h2>
                    <div class="dependencies-actions">
                        <button id="export-file-graph-png" class="btn btn-secondary">Export PNG</button>
                        <button id="export-file-graph-json" class="btn btn-secondary">Export JSON</button>
                        <button id="reset-file-graph" class="btn btn-secondary">Reset View</button>
                    </div>
                </div>
                <div id="file-dependency-info" class="dependency-info"></div>
                <div id="file-dependency-graph"></div>
            </div>
        `;
        
        // Initialize session view
        this.sessionContainer.innerHTML = `
            <div class="dependencies-view">
                <div class="dependencies-header">
                    <h2>Session Dependencies</h2>
                    <div class="dependencies-actions">
                        <button id="export-session-graph-png" class="btn btn-secondary">Export PNG</button>
                        <button id="export-session-graph-json" class="btn btn-secondary">Export JSON</button>
                        <button id="reset-session-graph" class="btn btn-secondary">Reset View</button>
                        <button id="clear-session-deps" class="btn btn-secondary">Clear Session</button>
                    </div>
                </div>
                <div id="session-dependency-info" class="dependency-info"></div>
                <div id="session-dependency-graph"></div>
            </div>
        `;
        
        // Event listeners for file view
        this.fileContainer.querySelector('#export-file-graph-png')?.addEventListener('click', () => this.exportPNG('file'));
        this.fileContainer.querySelector('#export-file-graph-json')?.addEventListener('click', () => this.exportJSON('file'));
        this.fileContainer.querySelector('#reset-file-graph')?.addEventListener('click', () => this.resetGraph('file'));
        
        // Event listeners for session view
        this.sessionContainer.querySelector('#export-session-graph-png')?.addEventListener('click', () => this.exportPNG('session'));
        this.sessionContainer.querySelector('#export-session-graph-json')?.addEventListener('click', () => this.exportJSON('session'));
        this.sessionContainer.querySelector('#reset-session-graph')?.addEventListener('click', () => this.resetGraph('session'));
        this.sessionContainer.querySelector('#clear-session-deps')?.addEventListener('click', () => this.clearSessionDeps());
    }
    
    async onFileProcessed(mod) {
        // Set as current mod
        this.currentMod = mod;
        
        // Clear caches for this mod
        const modCachePrefix = `${mod.id}/`;
        for (const key of this.fileContentCache.keys()) {
            if (key.startsWith(modCachePrefix)) {
                this.fileContentCache.delete(key);
            }
        }
        for (const key of this.fileTreeCache.keys()) {
            if (key.startsWith(modCachePrefix)) {
                this.fileTreeCache.delete(key);
            }
        }
        
        // Add to session mods if not already there
        const existing = this.sessionMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.sessionMods.push(mod);
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    setCurrentMod(mod) {
        // Set as current mod
        this.currentMod = mod;
        this.needsRender = true;
        
        // Clear caches for this mod
        const modCachePrefix = `${mod.id}/`;
        for (const key of this.fileContentCache.keys()) {
            if (key.startsWith(modCachePrefix)) {
                this.fileContentCache.delete(key);
            }
        }
        for (const key of this.fileTreeCache.keys()) {
            if (key.startsWith(modCachePrefix)) {
                this.fileTreeCache.delete(key);
            }
        }
        
        // Add to session mods if not already there
        const existing = this.sessionMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.sessionMods.push(mod);
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    render() {
        // Render both views
        this.renderFileDeps();
        this.renderSessionDeps();
    }
    
    renderFileDeps() {
        if (!this.currentMod || !this.currentMod.parsed) {
            this.setHTMLForContainer(this.fileContainer, '#file-dependency-graph', 
                '<div class="empty-state">No mod selected. Process a mod to see its dependencies and file hierarchy.</div>');
            return;
        }
        
        this.buildGraph('file', [this.currentMod]);
    }
    
    renderSessionDeps() {
        if (this.sessionMods.length === 0) {
            this.setHTMLForContainer(this.sessionContainer, '#session-dependency-graph', 
                '<div class="empty-state">No mods to display. Process some mods to see their dependencies.</div>');
            return;
        }
        
        this.buildGraph('session', this.sessionMods);
    }
    
    setHTMLForContainer(container, selector, html) {
        const element = container.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    /**
     * Extract file content from mod ZIP archive
     * @param {Object} mod - Mod object with fileData
     * @param {string} filePath - Path to file within archive
     * @returns {Promise<string|null>} File content or null if not found
     */
    async getFileContent(mod, filePath) {
        // Check cache first
        const cacheKey = `${mod.id}/${filePath}`;
        if (this.fileContentCache.has(cacheKey)) {
            return this.fileContentCache.get(cacheKey);
        }
        
        try {
            const zip = await JSZip.loadAsync(mod.fileData);
            const file = zip.file(filePath);
            if (!file) {
                this.fileContentCache.set(cacheKey, null);
                return null;
            }
            const content = await file.async('text');
            this.fileContentCache.set(cacheKey, content);
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            this.fileContentCache.set(cacheKey, null);
            return null;
        }
    }
    
    /**
     * Parse Lua file content to extract include() calls
     * @param {string} content - Lua file content
     * @returns {Array<string>} Array of included file paths
     */
    parseIncludesFromLua(content) {
        if (!content) return [];
        
        const includes = [];
        const lines = content.split('\n');
        
        // Regex patterns for different include formats
        const doubleQuoteRegex = /include\s*\(\s*"([^"]+)"\s*\)/g;
        const singleQuoteRegex = /include\s*\(\s*'([^']+)'\s*\)/g;
        const longStringRegex = /include\s*\(\s*\[\[([^\]]+)\]\]\s*\)/g;
        
        for (const line of lines) {
            // Skip commented lines
            const trimmed = line.trim();
            if (trimmed.startsWith('--')) continue;
            
            // Try all regex patterns
            let match;
            
            // Double quotes
            while ((match = doubleQuoteRegex.exec(line)) !== null) {
                includes.push(match[1]);
            }
            
            // Single quotes
            while ((match = singleQuoteRegex.exec(line)) !== null) {
                includes.push(match[1]);
            }
            
            // Long string syntax
            while ((match = longStringRegex.exec(line)) !== null) {
                includes.push(match[1]);
            }
        }
        
        return includes;
    }
    
    /**
     * Build hierarchical file tree from include relationships
     * @param {Object} mod - Mod object
     * @param {string} entryFile - Entry point file path
     * @returns {Promise<Object>} Tree structure with {path, children, missing, circular}
     */
    async buildFileTree(mod, entryFile = 'entry.lua') {
        // Check cache first
        const cacheKey = `${mod.id}/${entryFile}`;
        if (this.fileTreeCache.has(cacheKey)) {
            return this.fileTreeCache.get(cacheKey);
        }
        
        // Extract missing files from stderr errors
        const missingFiles = new Set();
        if (mod.errors) {
            mod.errors.forEach(error => {
                // Look for "Script missing: filename" errors
                const match = error.message.match(/Script missing:\s*([^\s.]+(?:\.[^.\s]+)?)/);
                if (match) {
                    missingFiles.add(match[1]);
                }
            });
        }
        
        const visited = new Set();
        const tree = { path: entryFile, children: [], missing: false, circular: false };
        
        const traverse = async (node, currentPath, pathStack = []) => {
            // Check for circular dependency
            if (pathStack.includes(currentPath)) {
                node.circular = true;
                return;
            }
            
            // Check if already visited
            if (visited.has(currentPath)) {
                return;
            }
            visited.add(currentPath);
            
            // Check if file is reported as missing by analyzer
            const fileName = currentPath.split('/').pop();
            if (missingFiles.has(currentPath) || missingFiles.has(fileName)) {
                node.missing = true;
                return;
            }
            
            // Get file content
            const content = await this.getFileContent(mod, currentPath);
            if (!content) {
                // File doesn't exist in ZIP, but only mark as missing if analyzer reported it
                if (missingFiles.has(currentPath) || missingFiles.has(fileName)) {
                    node.missing = true;
                }
                return;
            }
            
            // Parse includes
            const includes = this.parseIncludesFromLua(content);
            
            // Create child nodes
            for (const includePath of includes) {
                const childNode = { 
                    path: includePath, 
                    children: [], 
                    missing: false, 
                    circular: false 
                };
                node.children.push(childNode);
                
                // Recursively traverse
                await traverse(childNode, includePath, [...pathStack, currentPath]);
            }
        };
        
        await traverse(tree, entryFile);
        
        // Cache the tree
        this.fileTreeCache.set(cacheKey, tree);
        
        return tree;
    }
    
    /**
     * Convert file tree to D3 graph format (nodes and links)
     * @param {Object} tree - File tree structure
     * @param {string} parentModId - Parent mod package ID
     * @returns {Object} {nodes: [], links: [], depth: number}
     */
    treeToGraphData(tree, parentModId) {
        const nodes = [];
        const links = [];
        let maxDepth = 0;
        
        const traverse = (node, depth = 0, parentFileId = null, isRoot = false) => {
            maxDepth = Math.max(maxDepth, depth);
            
            const fileId = `${parentModId}/${node.path}`;
            const fileName = node.path.split('/').pop();
            
            // Skip creating node for root entry.lua - only process its children
            if (!isRoot) {
                // Create node
                const graphNode = {
                    id: fileId,
                    name: fileName,
                    fullPath: node.path,
                    category: 'file',
                    type: 'file',
                    hasData: !node.missing,
                    parentMod: parentModId,
                    depth: depth,
                    missing: node.missing,
                    circular: node.circular
                };
                nodes.push(graphNode);
                
                // Create link to parent (either mod or parent file)
                if (parentFileId) {
                    links.push({
                        source: parentFileId,
                        target: fileId,
                        type: 'file-include'
                    });
                } else {
                    // Non-root files without parent link to mod
                    links.push({
                        source: parentModId,
                        target: fileId,
                        type: 'contains'
                    });
                }
            }
            
            // Process children - for root, link them directly to mod
            for (const child of node.children) {
                traverse(child, isRoot ? 0 : depth + 1, isRoot ? parentModId : fileId, false);
            }
        };
        
        traverse(tree, 0, null, true);
        
        return { nodes, links, depth: maxDepth };
    }
    
    buildGraph(mode, modsToProcess) {
        const containerSelector = mode === 'file' ? '#file-dependency-graph' : '#session-dependency-graph';
        const container = mode === 'file' ? this.fileContainer : this.sessionContainer;
        const graphElement = container.querySelector(containerSelector);
        
        // Clear previous graph
        if (graphElement) {
            graphElement.innerHTML = '';
        }
        
        // Extract dependency data
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        // Process mods asynchronously
        const processModsAsync = async () => {
            for (const mod of modsToProcess) {
                if (!mod.parsed) continue;
                
                const deps = parser.extractDependencies(mod.parsed);
                
                // Add main mod node
                if (!nodeMap.has(deps.packageId)) {
                    const node = {
                        id: deps.packageId,
                        name: mod.parsed.name,
                        category: mod.parsed.category,
                        type: 'mod',
                        hasData: true
                    };
                    nodes.push(node);
                    nodeMap.set(deps.packageId, node);
                }
                
                // Add package dependency nodes and links
                deps.dependencies.forEach(depId => {
                    if (!nodeMap.has(depId)) {
                        const node = {
                            id: depId,
                            name: depId,
                            category: 'external',
                            type: 'package',
                            hasData: false
                        };
                        nodes.push(node);
                        nodeMap.set(depId, node);
                    }
                    
                    links.push({
                        source: deps.packageId,
                        target: depId,
                        type: 'package-dependency'
                    });
                });
                
                // Add file nodes using hierarchical tree
                if (mod.result && mod.result.data && mod.result.data.resources) {
                    const resources = mod.result.data.resources;
                    
                    // Build file tree from entry point
                    try {
                        const tree = await this.buildFileTree(mod, 'entry.lua');
                        const treeData = this.treeToGraphData(tree, deps.packageId);
                        
                        // Add nodes and links from tree
                        treeData.nodes.forEach(node => {
                            if (!nodeMap.has(node.id)) {
                                nodes.push(node);
                                nodeMap.set(node.id, node);
                            }
                        });
                        
                        treeData.links.forEach(link => {
                            links.push(link);
                        });
                    } catch (error) {
                        console.error('Error building file tree:', error);
                        // Fallback to flat file list if tree building fails
                        const luaFiles = resources.incs || [];
                        luaFiles.forEach(filePath => {
                            const fileId = `${deps.packageId}/${filePath}`;
                            if (!nodeMap.has(fileId)) {
                                const fileName = filePath.split('/').pop();
                                const node = {
                                    id: fileId,
                                    name: fileName,
                                    fullPath: filePath,
                                    category: 'file',
                                    type: 'file',
                                    hasData: true,
                                    parentMod: deps.packageId
                                };
                                nodes.push(node);
                                nodeMap.set(fileId, node);
                                
                                // Link file to its mod
                                links.push({
                                    source: deps.packageId,
                                    target: fileId,
                                    type: 'contains'
                                });
                            }
                        });
                    }
                }
            }
            
            // Detect circular dependencies
            const cycles = this.detectCycles(nodes, links);
            
            // Render with D3
            this.renderD3Graph(nodes, links, cycles, mode, container, containerSelector);
        };
        
        // Execute async processing
        processModsAsync();
    }
    
    detectCycles(nodes, links) {
        const cycles = [];
        const graph = new Map();
        
        // Build adjacency list
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            if (!graph.has(sourceId)) {
                graph.set(sourceId, []);
            }
            graph.get(sourceId).push(targetId);
        });
        
        // DFS to detect cycles
        const visited = new Set();
        const recStack = new Set();
        
        function dfs(node, path = []) {
            if (recStack.has(node)) {
                // Found cycle
                const cycleStart = path.indexOf(node);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart).concat(node));
                }
                return;
            }
            
            if (visited.has(node)) return;
            
            visited.add(node);
            recStack.add(node);
            path.push(node);
            
            const neighbors = graph.get(node) || [];
            neighbors.forEach(neighbor => dfs(neighbor, [...path]));
            
            recStack.delete(node);
        }
        
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        });
        
        return cycles;
    }
    
    renderD3Graph(nodes, links, cycles, mode, container, containerSelector) {
        const graphElement = container.querySelector(containerSelector);
        if (!graphElement) return;
        
        graphElement.innerHTML = '';
        
        const width = graphElement.clientWidth || 800;
        const height = 600;
        
        // Create SVG
        const svg = d3.select(graphElement)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'var(--bg-color)');
        
        // Add zoom behavior
        const g = svg.append('g');
        
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Nodes in cycles
        const cycleNodes = new Set(cycles.flat());
        
        // Create force simulation with hierarchical adjustments
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
                // Shorter distance for file-include links to show hierarchy
                return d.type === 'file-include' ? 80 : 100;
            }))
            .force('charge', d3.forceManyBody().strength(d => {
                // Less repulsion for file nodes to keep them closer
                return d.type === 'file' ? -200 : -300;
            }))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30))
            .force('y', d3.forceY().y(d => {
                // Optional: push files down based on depth for top-down layout
                if (d.type === 'file' && d.depth !== undefined) {
                    return 100 + (d.depth * 120);
                }
                return height / 2;
            }).strength(0.1));
        
        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                if (cycleNodes.has(sourceId) && cycleNodes.has(targetId)) {
                    return 'var(--error-color)';
                }
                // Different colors for different link types
                if (d.type === 'contains') return 'var(--text-secondary)';
                if (d.type === 'file-include') return 'var(--success-color)';
                return 'var(--primary-color)';
            })
            .attr('stroke-width', d => d.type === 'contains' ? 1 : 2)
            .attr('stroke-dasharray', d => d.type === 'contains' ? '5,5' : null)
            .attr('marker-end', 'url(#arrowhead)');
        
        // Add arrowhead marker
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', 'var(--border-color)');
        
        // Create nodes
        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .style('cursor', d => (d.type === 'mod' || d.type === 'file') ? 'pointer' : 'default')
            .on('click', (event, d) => this.handleNodeClick(event, d));
        
        // Add circles with different sizes for different node types
        node.append('circle')
            .attr('r', d => d.type === 'file' ? 12 : 20)
            .attr('fill', d => {
                if (cycleNodes.has(d.id)) return 'var(--error-color)';
                if (d.missing) return 'var(--warning-color)';
                if (d.type === 'file') return 'var(--success-color)';
                if (!d.hasData) return 'var(--text-secondary)';
                return 'var(--primary-color)';
            })
            .attr('stroke', d => {
                if (d.circular) return 'var(--error-color)';
                return 'var(--bg-color)';
            })
            .attr('stroke-width', d => d.circular ? 3 : 2);
        
        // Add labels
        node.append('text')
            .text(d => {
                const name = d.name || 'unknown';
                return name.length > 15 ? name.slice(0, 12) + '...' : name;
            })
            .attr('x', 0)
            .attr('y', d => d.type === 'file' ? 25 : 35)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-color)')
            .attr('font-size', d => d.type === 'file' ? '10px' : '12px');
        
        // Add tooltips
        node.append('title')
            .text(d => {
                if (d.type === 'file') {
                    let info = `File: ${d.name}\nPath: ${d.fullPath}\nMod: ${d.parentMod}`;
                    if (d.depth !== undefined) info += `\nDepth: ${d.depth}`;
                    if (d.missing) info += `\nStatus: Missing`;
                    if (d.circular) info += `\nStatus: Circular include detected`;
                    return info;
                }
                return `${d.name}\nID: ${d.id}\nCategory: ${d.category}\nType: ${d.type}`;
            });
        
        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Store graph for this mode
        if (mode === 'file') {
            this.fileGraph = { svg, simulation, nodes, links, cycles };
        } else {
            this.sessionGraph = { svg, simulation, nodes, links, cycles };
        }
        
        // Display info
        this.displayInfo(mode, { nodes, links, cycles });
    }
    
    displayInfo(mode, graph) {
        const infoSelector = mode === 'file' ? '#file-dependency-info' : '#session-dependency-info';
        const container = mode === 'file' ? this.fileContainer : this.sessionContainer;
        const info = container.querySelector(infoSelector);
        
        if (!graph || !info) {
            if (info) info.innerHTML = '';
            return;
        }
        
        const { nodes, links, cycles } = graph;
        const modNodes = nodes.filter(n => n.type === 'mod' || n.type === 'package');
        const fileNodes = nodes.filter(n => n.type === 'file');
        const externalNodes = nodes.filter(n => !n.hasData && n.type !== 'file').length;
        const missingFiles = fileNodes.filter(n => n.missing).length;
        
        // Calculate max tree depth
        const maxDepth = Math.max(0, ...fileNodes.map(n => n.depth || 0));
        
        const modeName = mode === 'file' && this.currentMod 
            ? `Current: ${this.currentMod.parsed.name}` 
            : 'All Session Mods';
        
        info.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <strong>View Mode:</strong> ${modeName}
                </div>
                <div class="info-item">
                    <strong>Total Nodes:</strong> ${nodes.length}
                </div>
                <div class="info-item">
                    <strong>Mods:</strong> ${modNodes.length - externalNodes}
                </div>
                <div class="info-item">
                    <strong>Files:</strong> ${fileNodes.length}
                </div>
                <div class="info-item">
                    <strong>Tree Depth:</strong> ${maxDepth}
                </div>
                <div class="info-item">
                    <strong>External Dependencies:</strong> ${externalNodes}
                </div>
                <div class="info-item">
                    <strong>Links:</strong> ${links.length}
                </div>
                <div class="info-item ${cycles.length > 0 ? 'error' : 'success'}">
                    <strong>Circular Dependencies:</strong> ${cycles.length > 0 ? '⚠ ' + cycles.length + ' detected' : '✓ None'}
                </div>
                ${missingFiles > 0 ? `
                <div class="info-item error">
                    <strong>Missing Files:</strong> ⚠ ${missingFiles}
                </div>
                ` : ''}
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-color); border-radius: 4px; font-size: 0.875rem;">
                <strong>Legend:</strong>
                <span style="margin-left: 1rem; color: var(--primary-color);">● Mod</span>
                <span style="margin-left: 1rem; color: var(--success-color);">● File</span>
                <span style="margin-left: 1rem; color: var(--text-secondary);">● External</span>
                <span style="margin-left: 1rem; color: var(--error-color);">● Circular</span>
                ${missingFiles > 0 ? `<span style="margin-left: 1rem; color: var(--warning-color);">● Missing</span>` : ''}
            </div>
            ${cycles.length > 0 ? `
                <div class="cycle-warning">
                    <h4>Circular Dependency Chains:</h4>
                    <ul>
                        ${cycles.map(cycle => `<li>${cycle.join(' → ')}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }
    
    resetGraph(mode) {
        const graph = mode === 'file' ? this.fileGraph : this.sessionGraph;
        const container = mode === 'file' ? this.fileContainer : this.sessionContainer;
        const svgSelector = mode === 'file' ? '#file-dependency-graph svg' : '#session-dependency-graph svg';
        
        if (graph && graph.svg) {
            const svg = d3.select(container.querySelector(svgSelector));
            svg.transition()
                .duration(750)
                .call(d3.zoom().transform, d3.zoomIdentity);
            
            graph.simulation.alpha(1).restart();
        }
    }
    
    exportPNG(mode) {
        const container = mode === 'file' ? this.fileContainer : this.sessionContainer;
        const svgSelector = mode === 'file' ? '#file-dependency-graph svg' : '#session-dependency-graph svg';
        const svgElement = container.querySelector(svgSelector);
        if (!svgElement) return;
        
        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);
        
        // Get the inner group (where nodes/links are rendered)
        const gElement = svgClone.querySelector('g');
        if (!gElement) return;
        
        // Get the bounding box of all content
        const bbox = this.getGraphBoundingBox(mode);
        if (!bbox) return;
        
        // Add padding around the content
        const padding = 40;
        const contentWidth = bbox.width + (padding * 2);
        const contentHeight = bbox.height + (padding * 2);
        
        // Reset any transform on the group and center the content
        gElement.setAttribute('transform', `translate(${padding - bbox.x}, ${padding - bbox.y})`);
        
        // Update SVG dimensions to fit content
        svgClone.setAttribute('width', contentWidth);
        svgClone.setAttribute('height', contentHeight);
        svgClone.setAttribute('viewBox', `0 0 ${contentWidth} ${contentHeight}`);
        
        // Get computed styles to resolve CSS variables
        const computedStyle = getComputedStyle(document.documentElement);
        const cssVars = {
            '--bg-color': computedStyle.getPropertyValue('--bg-color').trim(),
            '--text-color': computedStyle.getPropertyValue('--text-color').trim(),
            '--text-secondary': computedStyle.getPropertyValue('--text-secondary').trim(),
            '--primary-color': computedStyle.getPropertyValue('--primary-color').trim(),
            '--success-color': computedStyle.getPropertyValue('--success-color').trim(),
            '--error-color': computedStyle.getPropertyValue('--error-color').trim(),
            '--warning-color': computedStyle.getPropertyValue('--warning-color').trim(),
            '--border-color': computedStyle.getPropertyValue('--border-color').trim()
        };
        
        // Replace CSS variables in the clone
        this.replaceCSSVariables(svgClone, cssVars);
        
        // Create canvas at native resolution
        const scale = 1;
        const canvas = document.createElement('canvas');
        canvas.width = contentWidth * scale;
        canvas.height = contentHeight * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        
        // Fill background
        ctx.fillStyle = cssVars['--bg-color'] || '#1e1e1e';
        ctx.fillRect(0, 0, contentWidth, contentHeight);
        
        // Convert SVG to image and draw on canvas
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const img = new Image();
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, contentWidth, contentHeight);
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = mode === 'file' ? 'file-dependency-graph.png' : 'session-dependency-graph.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    /**
     * Get bounding box of all graph content
     */
    getGraphBoundingBox(mode) {
        const graph = mode === 'file' ? this.fileGraph : this.sessionGraph;
        if (!graph || !graph.nodes) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        graph.nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                const radius = node.type === 'file' ? 12 : 20;
                minX = Math.min(minX, node.x - radius);
                minY = Math.min(minY, node.y - radius - 35); // Account for label
                maxX = Math.max(maxX, node.x + radius);
                maxY = Math.max(maxY, node.y + radius + 10);
            }
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Replace CSS variables with computed values
     */
    replaceCSSVariables(element, cssVars) {
        // Handle fill attribute
        if (element.getAttribute && element.getAttribute('fill')) {
            let fill = element.getAttribute('fill');
            Object.keys(cssVars).forEach(varName => {
                if (fill.includes(varName)) {
                    fill = cssVars[varName];
                    element.setAttribute('fill', fill);
                }
            });
        }
        
        // Handle stroke attribute
        if (element.getAttribute && element.getAttribute('stroke')) {
            let stroke = element.getAttribute('stroke');
            Object.keys(cssVars).forEach(varName => {
                if (stroke.includes(varName)) {
                    stroke = cssVars[varName];
                    element.setAttribute('stroke', stroke);
                }
            });
        }
        
        // Handle style attribute
        if (element.getAttribute && element.getAttribute('style')) {
            let style = element.getAttribute('style');
            Object.keys(cssVars).forEach(varName => {
                const regex = new RegExp(`var\\(${varName}\\)`, 'g');
                style = style.replace(regex, cssVars[varName]);
            });
            element.setAttribute('style', style);
        }
        
        // Recurse through children
        if (element.children) {
            Array.from(element.children).forEach(child => this.replaceCSSVariables(child, cssVars));
        }
    }
    
    exportJSON(mode) {
        const graph = mode === 'file' ? this.fileGraph : this.sessionGraph;
        if (!graph) return;
        
        const data = {
            nodes: graph.nodes.map(n => ({
                id: n.id,
                name: n.name,
                category: n.category,
                hasData: n.hasData
            })),
            links: graph.links.map(l => ({
                source: l.source.id || l.source,
                target: l.target.id || l.target
            })),
            cycles: graph.cycles
        };
        
        const json = JSON.stringify(data, null, 2);
        const filename = mode === 'file' ? 'file-dependency-graph.json' : 'session-dependency-graph.json';
        this.downloadFile(filename, json, 'application/json');
    }
    
    clearSessionDeps() {
        if (confirm('Clear all session dependencies? This cannot be undone.')) {
            this.sessionMods = [];
            this.sessionGraph = null;
            this.render();
        }
    }
    
    clear() {
        // Clear session data on history clear
        this.sessionMods = [];
        this.currentMod = null;
        this.fileGraph = null;
        this.sessionGraph = null;
        this.fileContentCache.clear();
        this.fileTreeCache.clear();
        this.render();
    }
    
    async handleNodeClick(event, node) {
        // Only handle clicks on mods and files
        if (node.type === 'package' || !node.hasData) {
            return; // External dependencies have no files to show
        }
        
        if (!this.app) {
            console.warn('No app reference, cannot switch tabs');
            return;
        }
        
        // Determine target mod and file path
        const targetModId = node.type === 'mod' ? node.id : node.parentMod;
        const targetFilePath = node.type === 'mod' ? 'entry.lua' : node.fullPath;
        
        // Find the mod in processedMods list
        const modIndex = this.app.processedMods.findIndex(mod => {
            if (!mod.parsed) return false;
            const deps = parser.extractDependencies(mod.parsed);
            return deps.packageId === targetModId;
        });
        
        if (modIndex === -1) {
            console.warn('Could not find mod with package ID:', targetModId);
            return;
        }
        
        // Switch to that mod and wait for it to fully load
        await this.app.selectMod(modIndex);
        
        // Switch to files tab (this will trigger render)
        this.app.switchTab('files');
        
        // Now select the specific file - need to wait for render to complete
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const fileBrowserTab = this.app.tabs.files;
        if (fileBrowserTab && fileBrowserTab.selectFile) {
            fileBrowserTab.selectFile(targetFilePath);
        }
    }
}
