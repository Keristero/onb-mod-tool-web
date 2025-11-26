// Dependencies Tab - Visualizes mod dependency graph

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';

export default class DependenciesTab extends BaseTab {
    constructor() {
        super();
        this.sessionMods = []; // Reset on page load
        this.fileContainer = null;
        this.sessionContainer = null;
        this.fileGraph = null;
        this.sessionGraph = null;
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
                '<div class="empty-state">No mod selected. Process a mod to see its dependencies and file includes.</div>');
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
        
        modsToProcess.forEach(mod => {
            if (!mod.parsed) return;
            
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
            
            // Add file nodes and includes (if data available)
            if (mod.result && mod.result.data && mod.result.data.resources) {
                const resources = mod.result.data.resources;
                
                // Get all .lua files
                const luaFiles = [];
                if (resources.incs) {
                    luaFiles.push(...resources.incs);
                }
                
                // Create file nodes
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
                
                // TODO: Parse file includes from actual file content
                // For now, just show files belong to mod
            }
        });
        
        // Detect circular dependencies
        const cycles = this.detectCycles(nodes, links);
        
        // Render with D3
        this.renderD3Graph(nodes, links, cycles, mode, container, containerSelector);
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
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));
        
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
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        // Add circles with different sizes for different node types
        node.append('circle')
            .attr('r', d => d.type === 'file' ? 12 : 20)
            .attr('fill', d => {
                if (cycleNodes.has(d.id)) return 'var(--error-color)';
                if (d.type === 'file') return 'var(--success-color)';
                if (!d.hasData) return 'var(--text-secondary)';
                return 'var(--primary-color)';
            })
            .attr('stroke', 'var(--bg-color)')
            .attr('stroke-width', 2);
        
        // Add labels
        node.append('text')
            .text(d => d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name)
            .attr('x', 0)
            .attr('y', d => d.type === 'file' ? 25 : 35)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-color)')
            .attr('font-size', d => d.type === 'file' ? '10px' : '12px');
        
        // Add tooltips
        node.append('title')
            .text(d => {
                if (d.type === 'file') {
                    return `File: ${d.name}\nPath: ${d.fullPath}\nMod: ${d.parentMod}`;
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
        
        // Drag functions
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
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
                    <strong>External Dependencies:</strong> ${externalNodes}
                </div>
                <div class="info-item">
                    <strong>Links:</strong> ${links.length}
                </div>
                <div class="info-item ${cycles.length > 0 ? 'error' : 'success'}">
                    <strong>Circular Dependencies:</strong> ${cycles.length > 0 ? '⚠ ' + cycles.length + ' detected' : '✓ None'}
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-color); border-radius: 4px; font-size: 0.875rem;">
                <strong>Legend:</strong>
                <span style="margin-left: 1rem; color: var(--primary-color);">● Mod</span>
                <span style="margin-left: 1rem; color: var(--success-color);">● File</span>
                <span style="margin-left: 1rem; color: var(--text-secondary);">● External</span>
                <span style="margin-left: 1rem; color: var(--error-color);">● Circular</span>
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
        const svg = container.querySelector(svgSelector);
        if (!svg) return;
        
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = svg.clientWidth;
        canvas.height = svg.clientHeight;
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
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
        this.render();
    }
}
